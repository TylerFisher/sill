import { uuidv7 } from "uuidv7-js";
import {
  blueskyAccount,
  db,
  bookmark,
  bookmarkTag,
  tag,
  link,
  type linkPostDenormalized,
} from "@sill/schema";
import { handleBlueskyOAuth, ONE_DAY_MS } from "./bluesky.js";
import { eq } from "drizzle-orm";
import { Agent } from "@atproto/api";
import type { ProcessedResult } from "./links.js";

type BaseSliceResponse = {
  cid: string;
  did: string;
  indexedAt: string;
  uri: string;
};

export interface ATBookmarkResponse {
  cursor: string | null;
  records: ATBookmark[];
}

export interface ATBookmark extends BaseSliceResponse {
  collection: "community.lexicon.bookmarks.bookmark";
  value: ATBookmarkValue;
}

export interface ATBookmarkValue {
  $type: "community.lexicon.bookmarks.bookmark";
  subject: string;
  tags: string[];
  createdAt: string;
}

export interface ATProfileResponse extends BaseSliceResponse {
  collection: "app.bsky.actor.profile";
  value: ATProfileValue;
}

interface ATProfileImage {
  $type: "blob";
  mimeType: "image/jpeg";
  ref: {
    $link: "string";
  };
  size: number;
}

export interface ATProfileValue {
  $type: "app.bsky.actor.profile";
  avatar: ATProfileImage;
  banner: ATProfileImage;
  description: string | null;
  displayName: string | null;
}

const BASE_URL = "https://slices-api.fly.dev/xrpc";
const SLICE =
  "at://did:plc:2hgmrwevidwsxundvejdeam5/network.slices.slice/3m34awjg6w22z";

export const fetchLatestBookmarks = async (): Promise<ATBookmark[]> => {
  const response = await fetch(
    `${BASE_URL}/community.lexicon.bookmarks.bookmark.getRecords`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        slice: SLICE,
        sortBy: [
          {
            field: "createdAt",
            direction: "desc",
          },
        ],
        where: {
          subject: { contains: "https://" },
        },
        limit: 100,
      }),
    }
  );

  const data: ATBookmarkResponse = await response.json();
  const yesterday = new Date(Date.now() - ONE_DAY_MS).toISOString();
  return data.records.filter((f) => f.value.createdAt >= yesterday);
};

const getProfile = async (did: string): Promise<ATProfileResponse> => {
  const response = await fetch(
    `${BASE_URL}/app.bsky.actor.profile.getRecord?slice=${SLICE}&uri=at://${did}/app.bsky.actor.profile/self`
  );

  return await response.json();
};

export const formatBookmark = async (
  bookmark: ATBookmark,
  userId: string
): Promise<ProcessedResult | undefined> => {
  const profile = await getProfile(bookmark.did);
  if (!Object.hasOwn(profile, "did")) return undefined;

  return {
    link: {
      id: uuidv7(),
      url: bookmark.value.subject,
      title: "",
    },
    denormalized: {
      id: uuidv7(),
      postType: "atbookmark",
      postDate: bookmark.value.createdAt,
      postUrl: bookmark.uri,
      actorHandle: "dafeea",
      actorName: profile.value.displayName || "",
      actorUrl: `https://bsky.app/profile/${bookmark.did}`,
      postText: `${profile.value.displayName || ""} bookmarked this link`,
      linkUrl: bookmark.value.subject,
      userId,
    },
  };
};

const getFollows = async (userId: string) => {
  const bsky = await db.query.blueskyAccount.findFirst({
    where: eq(blueskyAccount.userId, userId),
  });

  if (!bsky) return [];

  const session = await handleBlueskyOAuth(bsky);
  if (!session) return [];
  const agent = new Agent(session);

  const allFollows = [];
  let cursor: string | undefined = undefined;

  do {
    const response = await agent.getFollows({
      actor: bsky.did,
      limit: 100,
      cursor,
    });

    allFollows.push(...response.data.follows);
    cursor = response.data.cursor;
  } while (cursor);

  return allFollows;
};

export const evaluateBookmark = async (
  bookmark: ATBookmark,
  userId: string
) => {
  const follows = await getFollows(userId);
  if (follows.length === 0) return false;
  const followDids = follows.map((f) => f.did);
  return followDids.includes(bookmark.did);
};

interface GetActorBookmarksResponse {
  bookmarks: ATBookmark[];
  cursor?: string;
}

export const getUserBookmarks = async (userId: string) => {
  const bsky = await db.query.blueskyAccount.findFirst({
    where: eq(blueskyAccount.userId, userId),
  });

  if (!bsky) return [];

  const session = await handleBlueskyOAuth(bsky);
  if (!session) return [];
  const agent = new Agent(session);

  const allBookmarks: ATBookmark[] = [];
  let cursor: string | undefined = undefined;
  let reachedPreviousBookmark = false;

  do {
    const response = await agent.call(
      "community.lexicon.bookmarks.getActorBookmarks",
      {
        limit: 100,
        cursor,
      }
    );

    const data = response.data as GetActorBookmarksResponse;

    // Check each bookmark to see if we've reached the most recent one we've seen
    for (const bookmark of data.bookmarks) {
      // Extract TID from URI (format: at://did/collection/tid)
      const tid = bookmark.uri.split("/").at(-1);

      if (tid === bsky.mostRecentBookmarkTid) {
        reachedPreviousBookmark = true;
        break;
      }

      allBookmarks.push(bookmark);
    }

    if (reachedPreviousBookmark) {
      break;
    }

    cursor = data.cursor;
  } while (cursor);

  // Update the most recent bookmark TID if we found new bookmarks
  if (allBookmarks.length > 0) {
    const mostRecentTid = allBookmarks[0].uri.split("/").at(-1);
    await db
      .update(blueskyAccount)
      .set({
        mostRecentBookmarkTid: mostRecentTid,
      })
      .where(eq(blueskyAccount.userId, userId));
  }

  return allBookmarks;
};

export const upsertTag = async (userId: string, tagName: string) => {
  return await db
    .insert(tag)
    .values({
      id: uuidv7(),
      name: tagName,
      userId,
    })
    .onConflictDoNothing()
    .returning({
      id: tag.id,
    });
};

export const addNewBookmarks = async (userId: string) => {
  // Get all new bookmarks from the user's Bluesky account
  const newBookmarks = await getUserBookmarks(userId);

  if (newBookmarks.length === 0) {
    return [];
  }

  const insertedBookmarks = [];

  for (const atBookmark of newBookmarks) {
    // Extract the TID (rkey) from the bookmark URI
    const rkey = atBookmark.uri.split("/").at(-1);

    // First, check if link exists and preserve its title
    const existingLink = await db.query.link.findFirst({
      where: eq(link.url, atBookmark.value.subject),
    });

    if (!existingLink) {
      await db.insert(link).values({
        id: uuidv7(),
        url: atBookmark.value.subject,
        title: "",
      });
    }

    // Insert the bookmark
    const [insertedBookmark] = await db
      .insert(bookmark)
      .values({
        id: uuidv7(),
        linkUrl: atBookmark.value.subject,
        userId,
        posts: {
          uniqueActorsCount: 0,
          link: null,
          posts: [],
        },
        atprotoRkey: rkey,
      })
      .onConflictDoNothing()
      .returning();

    if (insertedBookmark) {
      insertedBookmarks.push(insertedBookmark);

      // Process tags for this bookmark
      for (const tagName of atBookmark.value.tags) {
        // Upsert the tag (creates if doesn't exist, does nothing if it does)
        const tag = await upsertTag(userId, tagName);

        // Insert the bookmark-tag relationship
        await db
          .insert(bookmarkTag)
          .values({
            id: uuidv7(),
            bookmarkId: insertedBookmark.id,
            tagId: tag[0].id,
          })
          .onConflictDoNothing();
      }
    }
  }

  return insertedBookmarks;
};

/**
 * Updates a bookmark with new posts and recalculates the unique actors count.
 * Fetches new posts for the bookmark's URL and merges them with existing posts.
 */
export const updateBookmarkPosts = async (
  userBookmark: typeof bookmark.$inferSelect
) => {
  const posts = userBookmark.posts;
  const { filterLinkOccurrences } = await import("./links.js");

  const newPosts = await filterLinkOccurrences({
    userId: userBookmark.userId,
    url: userBookmark.linkUrl,
  });

  if (newPosts.length > 0) {
    for (const newPost of newPosts[0].posts.reverse()) {
      if (!posts.posts?.some((p) => p.id === newPost.id)) {
        posts.posts?.unshift(newPost);
      }
    }

    // Update uniqueActorsCount by counting unique actors
    const uniqueActors = new Set();

    for (const post of posts.posts || []) {
      const actorHandle = post.repostActorHandle || post.actorHandle;
      const actorName = post.repostActorHandle
        ? post.repostActorName
        : post.actorName;

      const normalizedHandle =
        post.postType === "mastodon"
          ? actorHandle.match(/^@?([^@]+)(?:@|$)/)?.[1]?.toLowerCase()
          : actorHandle
              .replace(".bsky.social", "")
              .replace("@", "")
              .toLowerCase();

      if (normalizedHandle) {
        const normalizedName = actorName
          ?.toLowerCase()
          .replace(/\s*\(.*?\)\s*/g, "");
        uniqueActors.add(`${normalizedName}|${normalizedHandle}`);
      }
    }

    // Update the uniqueActorsCount in the posts object
    posts.uniqueActorsCount = uniqueActors.size;

    await db
      .update(bookmark)
      .set({
        posts: posts,
      })
      .where(eq(bookmark.id, userBookmark.id));
  }
};
