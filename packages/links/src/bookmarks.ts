import { uuidv7 } from "uuidv7-js";
import { blueskyAccount, db, type linkPostDenormalized } from "@sill/schema";
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
  console.log(followDids.includes(bookmark.did), bookmark.did);
  return followDids.includes(bookmark.did);
};
