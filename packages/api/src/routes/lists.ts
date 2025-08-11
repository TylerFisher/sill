import { zValidator } from "@hono/zod-validator";
import { and, eq, or } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { uuidv7 } from "uuidv7-js";
import { getUserIdFromSession } from "../auth/auth.server";
import { db, list } from "@sill/schema";

// Schema for creating a list
const CreateListSchema = z.object({
  uri: z.string().min(1, "URI is required"),
  name: z.string().min(1, "Name is required"),
  accountId: z.string().min(1, "Account ID is required"),
  type: z.enum(["bluesky", "mastodon"]),
});

// Schema for deleting a list
const DeleteListSchema = z.object({
  uri: z.string().min(1, "URI is required"),
  accountId: z.string().min(1, "Account ID is required"),
});

const lists = new Hono()
  // POST /api/lists - Create a new list subscription
  .post("/", zValidator("json", CreateListSchema), async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);

    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    const { uri, name, accountId, type } = c.req.valid("json");

    try {
      // Check if list already exists
      const existingList = await db.query.list.findFirst({
        where: and(
          eq(list.uri, uri),
          or(
            eq(list.blueskyAccountId, accountId),
            eq(list.mastodonAccountId, accountId)
          )
        ),
      });

      if (existingList) {
        return c.json(
          {
            error: "List already subscribed",
            field: "uri",
          },
          409
        );
      }

      // Create new list subscription
      const result = await db
        .insert(list)
        .values({
          uri: uri,
          id: uuidv7(),
          name: name,
          blueskyAccountId: type === "bluesky" ? accountId : null,
          mastodonAccountId: type === "mastodon" ? accountId : null,
        })
        .returning({
          id: list.id,
          uri: list.uri,
          name: list.name,
        });

      return c.json({ success: true, list: result[0] });
    } catch (error) {
      console.error("Create list error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // DELETE /api/lists - Delete a list subscription
  .delete("/", zValidator("json", DeleteListSchema), async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);

    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    const { uri, accountId } = c.req.valid("json");

    try {
      // Delete the list subscription
      const result = await db
        .delete(list)
        .where(
          and(
            eq(list.uri, uri),
            or(
              eq(list.blueskyAccountId, accountId),
              eq(list.mastodonAccountId, accountId)
            )
          )
        )
        .returning({
          id: list.id,
          uri: list.uri,
          name: list.name,
        });

      if (result.length === 0) {
        return c.json(
          {
            error: "List subscription not found",
            field: "uri",
          },
          404
        );
      }

      return c.json({ success: true, deleted: result[0] });
    } catch (error) {
      console.error("Delete list error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

export default lists;
