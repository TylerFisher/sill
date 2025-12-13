import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { uuidv7 } from "uuidv7-js";
import { z } from "zod";
import { getUserIdFromSession, createOAuthClient } from "@sill/auth";
import {
  db,
  type MostRecentLinkPosts,
  bookmark,
  bookmarkTag,
  tag,
  blueskyAccount,
  link,
} from "@sill/schema";
import { filterLinkOccurrences } from "@sill/links";
import { Agent } from "@atproto/api";
import { TID } from "@atproto/common";
import { addNewBookmarks } from "@sill/links";

/**
 * Get an ATProto agent for a user's Bluesky account
 */
async function getAgentForUser(
  userId: string,
  request: Request
): Promise<Agent | null> {
  const account = await db.query.blueskyAccount.findFirst({
    where: eq(blueskyAccount.userId, userId),
  });

  if (!account) {
    return null;
  }

  const oauthClient = await createOAuthClient(request);
  const oauthSession = await oauthClient.restore(account.did);

  if (!oauthSession) {
    return null;
  }

  return new Agent(oauthSession);
}

/**
 * Publish a bookmark to the user's ATProto PDS
 * Returns the rkey of the created record
 */
async function publishBookmarkToAtproto(
  agent: Agent,
  userId: string,
  url: string,
  tags?: string[]
): Promise<string> {
  const rkey = TID.nextStr();
  const createdAt = new Date().toISOString();

  await agent.com.atproto.repo.putRecord({
    repo: agent.assertDid,
    collection: "community.lexicon.bookmarks.bookmark",
    rkey,
    record: {
      $type: "community.lexicon.bookmarks.bookmark",
      subject: url,
      createdAt,
      ...(tags && tags.length > 0 ? { tags } : {}),
    },
  });

  // Update the mostRecentBookmarkDate in the blueskyAccount
  await db
    .update(blueskyAccount)
    .set({ mostRecentBookmarkDate: createdAt })
    .where(eq(blueskyAccount.userId, userId));

  return rkey;
}

/**
 * Delete a bookmark from the user's ATProto PDS
 */
async function deleteBookmarkFromAtproto(
  agent: Agent,
  rkey: string
): Promise<void> {
  await agent.com.atproto.repo.deleteRecord({
    repo: agent.assertDid,
    collection: "community.lexicon.bookmarks.bookmark",
    rkey,
  });
}

/**
 * Update a bookmark in the user's ATProto PDS
 */
async function updateBookmarkInAtproto(
  agent: Agent,
  rkey: string,
  url: string,
  tags?: string[]
): Promise<void> {
  await agent.com.atproto.repo.putRecord({
    repo: agent.assertDid,
    collection: "community.lexicon.bookmarks.bookmark",
    rkey,
    record: {
      $type: "community.lexicon.bookmarks.bookmark",
      subject: url,
      ...(tags && tags.length > 0 ? { tags } : {}),
    },
  });
}

// Schema for listing bookmarks
const ListBookmarksSchema = z.object({
  query: z.string().optional(),
  tag: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

// Schema for adding a bookmark
const AddBookmarkSchema = z.object({
  url: z.string().url(),
  tags: z.string().optional(),
  publishToAtproto: z.boolean().optional(),
});

// Schema for deleting a bookmark
const DeleteBookmarkSchema = z.object({
  url: z.string().url(),
});

// Schema for deleting a tag from a bookmark
const DeleteBookmarkTagSchema = z.object({
  url: z.string().url(),
  tagName: z.string(),
});

type BookmarkTagData = {
  tag: typeof tag.$inferSelect;
};

type BookmarkWithLinkPosts = typeof bookmark.$inferSelect & {
  linkPosts?: MostRecentLinkPosts;
  bookmarkTags?: BookmarkTagData[];
};

const bookmarks = new Hono()
  // GET /api/bookmarks - List bookmarks with optional search and pagination
  .get("/", zValidator("query", ListBookmarksSchema), async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);

    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    const { query, tag: tagFilter, page, limit } = c.req.valid("query");

    await addNewBookmarks(userId);

    try {
      // Build where conditions
      const conditions = [eq(bookmark.userId, userId)];

      // Add text search condition
      if (query) {
        conditions.push(
          or(
            ilike(bookmark.linkUrl, `%${query}%`),
            sql`${bookmark.posts}::jsonb->'link'->>'title' ILIKE ${`%${query}%`}`,
            sql`${bookmark.posts}::jsonb->'link'->>'description' ILIKE ${`%${query}%`}`
          )!
        );
      }

      // Add tag filter condition
      if (tagFilter) {
        conditions.push(
          sql`EXISTS (
            SELECT 1 FROM bookmark_tag
            INNER JOIN tag ON bookmark_tag."tagId" = tag.id
            WHERE bookmark_tag."bookmarkId" = bookmark.id
            AND tag.name = ${tagFilter}
            AND tag."userId" = ${userId}
          )`
        );
      }

      const bookmarkResults: BookmarkWithLinkPosts[] =
        await db.query.bookmark.findMany({
          where: and(...conditions),
          with: {
            bookmarkTags: {
              with: {
                tag: true,
              },
            },
          },
          orderBy: desc(bookmark.createdAt),
          limit,
          offset: (page - 1) * limit,
        });

      return c.json({
        bookmarks: bookmarkResults,
        page,
        limit,
        hasMore: bookmarkResults.length === limit,
      });
    } catch (error) {
      console.error("List bookmarks error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })

  // POST /api/bookmarks - Add a bookmark
  .post("/", zValidator("json", AddBookmarkSchema), async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);

    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    const { url, tags: tagsString, publishToAtproto } = c.req.valid("json");

    try {
      // Check if bookmark already exists
      const existingBookmark = await db.query.bookmark.findFirst({
        where: and(eq(bookmark.userId, userId), eq(bookmark.linkUrl, url)),
      });

      if (existingBookmark) {
        return c.json({ error: "Bookmark already exists" }, 409);
      }

      // Get link posts data
      let posts: MostRecentLinkPosts[] = await filterLinkOccurrences({
        userId,
        url,
      });

      if (posts.length === 0) {
        let dbLink: typeof link.$inferSelect | undefined =
          await db.query.link.findFirst({
            where: eq(link.url, url),
          });

        if (!dbLink) {
          [dbLink] = await db
            .insert(link)
            .values({
              id: uuidv7(),
              url,
              title: "",
            })
            .returning();
        }

        posts = [
          {
            link: dbLink,
            posts: [],
            uniqueActorsCount: 0,
          },
        ];
      }

      // Publish to ATProto first if requested, so we have the rkey
      let atprotoRkey: string | undefined;
      if (publishToAtproto) {
        try {
          const agent = await getAgentForUser(userId, c.req.raw);
          if (agent) {
            const tagNames = tagsString
              ? tagsString
                  .split(",")
                  .map((t) => t.trim())
                  .filter((t) => t.length > 0)
              : undefined;

            atprotoRkey = await publishBookmarkToAtproto(
              agent,
              userId,
              url,
              tagNames
            );
          } else {
            console.warn(
              "Could not get ATProto agent for user, skipping publish"
            );
          }
        } catch (error) {
          console.error("Failed to publish bookmark to ATProto:", error);
          // Continue with bookmark creation even if ATProto publish fails
        }
      }

      // Create bookmark and tags in a transaction
      const result = await db.transaction(async (tx) => {
        // Create bookmark
        const newBookmark = await tx
          .insert(bookmark)
          .values({
            id: uuidv7(),
            userId,
            linkUrl: url,
            posts: posts[0],
            published: publishToAtproto && !!atprotoRkey,
            atprotoRkey: atprotoRkey || null,
          })
          .returning();

        const bookmarkId = newBookmark[0].id;

        // Process tags if provided
        if (tagsString?.trim()) {
          // Parse comma-separated tags and trim whitespace
          const tagNames = tagsString
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t.length > 0);

          // Validate tag lengths (max 30 characters)
          const invalidTags = tagNames.filter((t) => t.length > 30);
          if (invalidTags.length > 0) {
            return c.json(
              {
                error: `Tags must be 30 characters or less: ${invalidTags.join(
                  ", "
                )}`,
              },
              400
            );
          }

          // Create or get existing tags
          const tagIds: string[] = [];
          for (const tagName of tagNames) {
            // Check if tag already exists for this user
            let existingTag = await tx.query.tag.findFirst({
              where: and(eq(tag.userId, userId), eq(tag.name, tagName)),
            });

            if (!existingTag) {
              // Create new tag
              const newTag = await tx
                .insert(tag)
                .values({
                  id: uuidv7(),
                  userId,
                  name: tagName,
                })
                .returning();
              existingTag = newTag[0];
            }

            tagIds.push(existingTag.id);
          }

          // Create bookmark-tag associations
          if (tagIds.length > 0) {
            await tx.insert(bookmarkTag).values(
              tagIds.map((tagId) => ({
                id: uuidv7(),
                bookmarkId,
                tagId,
              }))
            );
          }
        }

        return newBookmark[0];
      });

      return c.json({
        success: true,
        bookmark: result,
      });
    } catch (error) {
      console.error("Add bookmark error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })

  // DELETE /api/bookmarks - Delete a bookmark
  .delete("/", zValidator("json", DeleteBookmarkSchema), async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);

    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    const { url } = c.req.valid("json");

    try {
      // First, find the bookmark to check if it was published
      const existingBookmark = await db.query.bookmark.findFirst({
        where: and(eq(bookmark.userId, userId), eq(bookmark.linkUrl, url)),
      });

      if (!existingBookmark) {
        return c.json({ error: "Bookmark not found" }, 404);
      }

      // Delete from ATProto if it was published
      if (existingBookmark.published && existingBookmark.atprotoRkey) {
        try {
          const agent = await getAgentForUser(userId, c.req.raw);
          if (agent) {
            await deleteBookmarkFromAtproto(
              agent,
              existingBookmark.atprotoRkey
            );
          } else {
            console.warn(
              "Could not get ATProto agent for user, skipping ATProto deletion"
            );
          }
        } catch (error) {
          console.error("Failed to delete bookmark from ATProto:", error);
          // Continue with local deletion even if ATProto deletion fails
        }
      }

      // Delete from local database
      const deletedBookmarks = await db
        .delete(bookmark)
        .where(and(eq(bookmark.userId, userId), eq(bookmark.linkUrl, url)))
        .returning();

      return c.json({
        success: true,
        deletedBookmark: deletedBookmarks[0],
      });
    } catch (error) {
      console.error("Delete bookmark error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })

  // GET /api/bookmarks/tags - Get all unique tags for the user
  .get("/tags", async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);

    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    try {
      const tags = await db.query.tag.findMany({
        where: eq(tag.userId, userId),
        orderBy: desc(tag.name),
      });

      return c.json({ tags });
    } catch (error) {
      console.error("Get tags error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })

  // DELETE /api/bookmarks/tag - Delete a tag from a bookmark
  .delete("/tag", zValidator("json", DeleteBookmarkTagSchema), async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);

    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    const { url, tagName } = c.req.valid("json");

    try {
      // Find the bookmark with its tags
      const existingBookmark = await db.query.bookmark.findFirst({
        where: and(eq(bookmark.userId, userId), eq(bookmark.linkUrl, url)),
        with: {
          bookmarkTags: {
            with: {
              tag: true,
            },
          },
        },
      });

      if (!existingBookmark) {
        return c.json({ error: "Bookmark not found" }, 404);
      }

      // Find the tag
      const existingTag = await db.query.tag.findFirst({
        where: and(eq(tag.userId, userId), eq(tag.name, tagName)),
      });

      if (!existingTag) {
        return c.json({ error: "Tag not found" }, 404);
      }

      // Delete the bookmark-tag association
      await db
        .delete(bookmarkTag)
        .where(
          and(
            eq(bookmarkTag.bookmarkId, existingBookmark.id),
            eq(bookmarkTag.tagId, existingTag.id)
          )
        );

      // Update ATProto record if the bookmark was published
      if (existingBookmark.published && existingBookmark.atprotoRkey) {
        try {
          const agent = await getAgentForUser(userId, c.req.raw);
          if (agent) {
            // Get remaining tags after deletion
            const remainingTags = existingBookmark.bookmarkTags
              .map((bt) => bt.tag.name)
              .filter((name) => name !== tagName);

            await updateBookmarkInAtproto(
              agent,
              existingBookmark.atprotoRkey,
              url,
              remainingTags.length > 0 ? remainingTags : undefined
            );
          } else {
            console.warn(
              "Could not get ATProto agent for user, skipping ATProto update"
            );
          }
        } catch (error) {
          console.error("Failed to update bookmark in ATProto:", error);
          // Continue even if ATProto update fails
        }
      }

      return c.json({
        success: true,
        message: "Tag removed from bookmark",
      });
    } catch (error) {
      console.error("Delete bookmark tag error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

export default bookmarks;
