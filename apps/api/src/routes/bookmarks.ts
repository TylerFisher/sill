import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { uuidv7 } from "uuidv7-js";
import { z } from "zod";
import { getUserIdFromSession } from "@sill/auth";
import {
  db,
  type MostRecentLinkPosts,
  bookmark,
  bookmarkTag,
  digestItem,
  tag,
} from "@sill/schema";
import { filterLinkOccurrences } from "@sill/links";

// Schema for listing bookmarks
const ListBookmarksSchema = z.object({
  query: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

// Schema for adding a bookmark
const AddBookmarkSchema = z.object({
  url: z.string().url(),
  tags: z.string().optional(),
});

// Schema for deleting a bookmark
const DeleteBookmarkSchema = z.object({
  url: z.string().url(),
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

    const { query, page, limit } = c.req.valid("query");

    try {
      const bookmarkResults: BookmarkWithLinkPosts[] =
        await db.query.bookmark.findMany({
          where: and(
            eq(bookmark.userId, userId),
            query
              ? or(
                  sql`${bookmark.linkUrl} ILIKE ${`%${query}%`}`,
                  sql`${
                    bookmark.posts
                  }::jsonb->>'link.title' ILIKE ${`%${query}%`}`,
                  sql`${
                    bookmark.posts
                  }::jsonb->>'link.description' ILIKE ${`%${query}%`}`
                )
              : undefined
          ),
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

    const { url, tags: tagsString } = c.req.valid("json");

    try {
      // Check if bookmark already exists
      const existingBookmark = await db.query.bookmark.findFirst({
        where: and(eq(bookmark.userId, userId), eq(bookmark.linkUrl, url)),
      });

      if (existingBookmark) {
        return c.json({ error: "Bookmark already exists" }, 409);
      }

      // Get link posts data
      const posts: MostRecentLinkPosts[] = await filterLinkOccurrences({
        userId,
        url,
      });

      // If no posts found, try to find in digest items
      if (posts.length === 0) {
        const digestEdition = await db.query.digestItem.findFirst({
          where: and(
            eq(digestItem.userId, userId),
            sql`EXISTS (
							SELECT 1 FROM json_array_elements(${digestItem.json}::json) as items
							WHERE items->'link'->>'url' = ${url}
						)`
          ),
        });

        let matchingPost: MostRecentLinkPosts | null | undefined = null;
        if (digestEdition?.json) {
          matchingPost = digestEdition.json.find(
            (item) => item.link?.url === url
          );
        }

        if (matchingPost) {
          posts.push(matchingPost);
        }
      }

      // If still no posts, return error
      if (posts.length === 0) {
        return c.json({ error: "No post data found for this URL" }, 404);
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
      const deletedBookmarks = await db
        .delete(bookmark)
        .where(and(eq(bookmark.userId, userId), eq(bookmark.linkUrl, url)))
        .returning();

      if (deletedBookmarks.length === 0) {
        return c.json({ error: "Bookmark not found" }, 404);
      }

      return c.json({
        success: true,
        deletedBookmark: deletedBookmarks[0],
      });
    } catch (error) {
      console.error("Delete bookmark error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

export default bookmarks;
