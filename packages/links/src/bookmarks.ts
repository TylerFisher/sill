import { uuidv7 } from "uuidv7-js";
import {
  blueskyAccount,
  db,
  bookmark,
  bookmarkTag,
  tag,
  type Link,
} from "@sill/schema";
import { eq } from "drizzle-orm";
import {
  appViewEnabled,
  fetchActorActivity,
  fetchUrlMetadata,
  type ShareRow,
  toIso,
  urlItemToLink,
  type UrlMetaItem,
} from "./appview.js";

/**
 * Build the `Link` snapshot embedded in `bookmark.posts.link`. Uses the
 * AppView `/v1/url` metadata when available; falls back to a bare stub
 * (URL only, empty title) for URLs the AppView hasn't scraped yet.
 */
const linkFromUrlMeta = (url: string, meta?: UrlMetaItem): Link =>
  urlItemToLink(meta ?? { url }, null);

/**
 * Pull the `tags` array off a community-bookmark record (the AppView returns
 * `share.record` as the raw JSON-stringified lexicon body). Returns `[]` for
 * absent / unparseable / non-array values.
 */
const extractBookmarkTags = (raw: string): string[] => {
  try {
    const parsed = JSON.parse(raw) as { tags?: unknown };
    return Array.isArray(parsed.tags)
      ? parsed.tags.filter((t): t is string => typeof t === "string")
      : [];
  } catch {
    return [];
  }
};

/**
 * Pull the user's new community-bookmark records via the AppView's
 * `/v1/actor-activity` (open by actor — no Bluesky OAuth agent restore). Stops
 * paging when it hits the previously-seen newest bookmark (`mostRecentBookmark
 * Date` checkpoint) or runs out of cursor. Mastodon-only users skip — they
 * have no atproto repo to walk. AppView caps the window at 90 days; older
 * bookmarks beyond a 90-day gap won't be picked up here.
 */
export const getUserBookmarks = async (
  userId: string,
): Promise<ShareRow[]> => {
  const bsky = await db.query.blueskyAccount.findFirst({
    where: eq(blueskyAccount.userId, userId),
  });
  if (!bsky) return [];
  if (!appViewEnabled()) return [];

  const existingBookmarks = await db.query.bookmark.findMany({
    where: eq(bookmark.userId, userId),
    columns: { linkUrl: true },
  });
  const existingUrls = new Set(existingBookmarks.map((b) => b.linkUrl));

  const checkpoint = bsky.mostRecentBookmarkDate
    ? new Date(`${bsky.mostRecentBookmarkDate.replace(" ", "T")}Z`)
    : null;
  const checkpointMs =
    checkpoint && !Number.isNaN(checkpoint.getTime())
      ? checkpoint.getTime()
      : null;

  const allItems: ShareRow[] = [];
  let cursor: string | undefined;
  let reachedCheckpoint = false;

  do {
    let res: Awaited<ReturnType<typeof fetchActorActivity>>;
    try {
      res = await fetchActorActivity({
        actor: bsky.did,
        collection: ["community.lexicon.bookmarks.bookmark"],
        days: 90,
        limit: 100,
        cursor,
      });
    } catch (e) {
      console.error("AppView /v1/actor-activity failed:", e);
      break;
    }

    for (const item of res.items) {
      const itemIso = toIso(item.eventTime);
      const itemMs = itemIso ? new Date(itemIso).getTime() : null;
      if (
        checkpointMs !== null &&
        itemMs !== null &&
        itemMs <= checkpointMs
      ) {
        reachedCheckpoint = true;
        break;
      }
      if (existingUrls.has(item.url)) continue;
      allItems.push(item);
    }
    if (reachedCheckpoint) break;
    cursor = res.cursor;
  } while (cursor);

  // Advance the checkpoint to the newest item we just ingested (items are
  // returned newest-first, so [0] is the freshest).
  if (allItems.length > 0) {
    const newest = toIso(allItems[0].eventTime);
    if (newest) {
      await db
        .update(blueskyAccount)
        .set({ mostRecentBookmarkDate: newest })
        .where(eq(blueskyAccount.userId, userId));
    }
  }

  return allItems;
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
  const newItems = await getUserBookmarks(userId);

  if (newItems.length === 0) {
    return [];
  }

  // One AppView `/v1/url` call for the whole page of new bookmarks; the
  // helper chunks at 100 URLs so larger backfills still work.
  const urls = Array.from(new Set(newItems.map((i) => i.url)));
  const metaByUrl = await fetchUrlMetadata(urls);

  const insertedBookmarks = [];

  for (const item of newItems) {
    const url = item.url;
    const rkey = item.atUri.split("/").pop();
    const createdAt = toIso(item.eventTime) ?? new Date().toISOString();
    const tags = extractBookmarkTags(item.record);
    const [insertedBookmark] = await db
      .insert(bookmark)
      .values({
        id: uuidv7(),
        linkUrl: url,
        userId,
        createdAt,
        posts: {
          uniqueActorsCount: 0,
          link: linkFromUrlMeta(url, metaByUrl.get(url)),
          posts: [],
        },
        atprotoRkey: rkey,
        published: true,
      })
      .onConflictDoNothing()
      .returning();

    if (insertedBookmark) {
      insertedBookmarks.push(insertedBookmark);

      // Process tags for this bookmark
      if (tags.length === 0) continue;

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
