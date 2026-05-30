import { uuidv7 } from "uuidv7-js";
import {
  blueskyAccount,
  db,
  bookmark,
  bookmarkTag,
  tag,
  link,
} from "@sill/schema";
import { getOrCreateAgent, ONE_DAY_MS } from "./bluesky.js";
import { eq } from "drizzle-orm";
import {
  appViewEnabled,
  fetchHydration,
  networkFromService,
  resolveRepostSubjects,
  shareRowToLinkPost,
} from "./appview.js";

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
  tags?: string[];
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

/**
 * @deprecated The `ProcessedResult` tuple this returned is gone with the
 * AppView cutover. Retained as a no-op so any historic external callers
 * still resolve to undefined.
 */
export const formatBookmark = async (
  _bookmark: ATBookmark,
  _userId: string,
): Promise<undefined> => {
  return undefined;
};

const getFollows = async (userId: string) => {
  const bsky = await db.query.blueskyAccount.findFirst({
    where: eq(blueskyAccount.userId, userId),
  });

  if (!bsky) return [];

  const agent = await getOrCreateAgent(bsky);
  if (!agent) return [];

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

export const getUserBookmarks = async (userId: string) => {
  const bsky = await db.query.blueskyAccount.findFirst({
    where: eq(blueskyAccount.userId, userId),
  });

  if (!bsky) return [];

  const existingBookmarks = await db.query.bookmark.findMany({
    where: eq(bookmark.userId, userId),
  });

  const agent = await getOrCreateAgent(bsky);
  if (!agent) return [];

  const allBookmarks: ATBookmark[] = [];
  let cursor: string | undefined = undefined;
  let reachedPreviousBookmark = false;

  do {
    // Use com.atproto.repo.listRecords instead of the custom lexicon query
    // since the agent doesn't have the community lexicon loaded
    const response = await agent.com.atproto.repo.listRecords({
      repo: bsky.did,
      collection: "community.lexicon.bookmarks.bookmark",
      limit: 100,
      cursor,
    });

    const data = {
      bookmarks: response.data.records as unknown as ATBookmark[],
      cursor: response.data.cursor,
    };

    // Check each bookmark to see if we've reached the most recent one we've seen
    for (const bookmark of data.bookmarks) {
      let checkDate: string | null = null;

      if (bsky.mostRecentBookmarkDate) {
        const dateStr = `${bsky.mostRecentBookmarkDate.replace(" ", "T")}Z`;
        const parsedDate = new Date(dateStr);

        // Validate the date is valid before using it
        if (!Number.isNaN(parsedDate.getTime())) {
          checkDate = parsedDate.toISOString();
        }
      }

      if (
        checkDate &&
        new Date(bookmark.value.createdAt).toISOString() === checkDate
      ) {
        reachedPreviousBookmark = true;
        break;
      }

      if (existingBookmarks.find((b) => b.linkUrl === bookmark.value.subject)) {
        continue;
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
    await db
      .update(blueskyAccount)
      .set({
        mostRecentBookmarkDate: allBookmarks[0].value.createdAt,
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
    // First, check if link exists and preserve its title
    let dbLink: typeof link.$inferSelect | undefined =
      await db.query.link.findFirst({
        where: eq(link.url, atBookmark.value.subject),
      });

    if (!dbLink) {
      const insert = await db
        .insert(link)
        .values({
          id: uuidv7(),
          url: atBookmark.value.subject,
          title: "",
        })
        .returning();

      dbLink = insert[0];
    }

    // Insert the bookmark
    const [insertedBookmark] = await db
      .insert(bookmark)
      .values({
        id: uuidv7(),
        linkUrl: atBookmark.value.subject,
        userId,
        createdAt: atBookmark.value.createdAt,
        posts: {
          uniqueActorsCount: 0,
          link: dbLink,
          posts: [],
        },
        atprotoRkey: atBookmark.uri.split("/").pop(),
        published: true,
      })
      .onConflictDoNothing()
      .returning();

    if (insertedBookmark) {
      insertedBookmarks.push(insertedBookmark);

      // Process tags for this bookmark
      const tags = atBookmark.value.tags;
      if (!Array.isArray(tags)) continue;

      for (const tagName of tags) {
        // Upsert the tag (creates if doesn't exist, does nothing if it does)
        const tagResult = await upsertTag(userId, tagName);

        // If tag was inserted, use it; otherwise fetch existing tag
        let tagId: string;
        if (tagResult.length > 0) {
          tagId = tagResult[0].id;
        } else {
          // Tag already exists, fetch it
          const existingTag = await db.query.tag.findFirst({
            where: eq(tag.userId, userId) && eq(tag.name, tagName),
            columns: { id: true },
          });
          if (!existingTag) continue; // Skip if tag not found
          tagId = existingTag.id;
        }

        // Insert the bookmark-tag relationship
        await db
          .insert(bookmarkTag)
          .values({
            id: uuidv7(),
            bookmarkId: insertedBookmark.id,
            tagId,
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

  // Hydrate the URL's viewer-scoped shares from the AppView and merge any
  // newly observed posts into the bookmark snapshot, oldest-first so that
  // unshift preserves recency order.
  if (appViewEnabled()) {
    const viewerAccount = await db.query.blueskyAccount.findFirst({
      where: eq(blueskyAccount.userId, userBookmark.userId),
    });
    if (viewerAccount) {
      try {
        let shares = await fetchHydration({
          viewer: viewerAccount.did,
          urls: [userBookmark.linkUrl],
          window: { days: 1 },
          hideReposts: "include",
          network: networkFromService("all"),
        });
        shares = await resolveRepostSubjects(shares);
        const newPosts = shares
          .map((s) => shareRowToLinkPost(s, userBookmark.userId))
          .sort(
            (a, b) =>
              new Date(a.postDate).getTime() - new Date(b.postDate).getTime(),
          );
        for (const newPost of newPosts) {
          if (!posts.posts?.some((p) => p.id === newPost.id)) {
            posts.posts?.unshift(newPost);
          }
        }
      } catch (e) {
        console.error("AppView hydration failed for bookmark update:", e);
      }
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

  // Update posts object with new data
  posts.uniqueActorsCount = uniqueActors.size;
  posts.posts = posts.posts || [];

  await db
    .update(bookmark)
    .set({
      posts: posts,
    })
    .where(eq(bookmark.id, userBookmark.id));
};
