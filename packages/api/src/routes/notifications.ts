import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { uuidv7 } from "uuidv7-js";
import { getUserIdFromSession } from "../auth/auth.server.js";
import {
  db,
  notificationGroup,
  notificationItem,
  type NotificationQuery,
} from "@sill/schema";
import { evaluateNotifications } from "../utils/links.server.js";
import { and, desc, isNotNull } from "drizzle-orm";

// Schema for deleting a notification group
const DeleteNotificationGroupSchema = z.object({
  groupId: z.string().uuid(),
});

// Schema for testing notifications
const TestNotificationsSchema = z.object({
  queries: z.array(
    z.object({
      category: z.object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
        values: z
          .array(
            z.object({
              id: z.string(),
              name: z.string(),
            })
          )
          .optional(),
      }),
      operator: z.string(),
      value: z.union([z.string(), z.number()]),
    })
  ),
});

// Schema for getting notification group feed data
const GetNotificationGroupFeedSchema = z.object({
  notificationGroupId: z.string().uuid(),
});

// Schema for creating/updating notification group
const CreateNotificationGroupSchema = z.object({
  id: z.string().optional(),
  format: z.enum(["email", "rss"]),
  queries: z.array(
    z.object({
      category: z.object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
      }),
      operator: z.string(),
      value: z.union([z.string(), z.number()]),
    })
  ),
  name: z.string().max(100),
});

const notifications = new Hono()
  // DELETE /api/notifications/groups/:groupId - Delete notification group
  .delete(
    "/groups/:groupId",
    zValidator("param", DeleteNotificationGroupSchema),
    async (c) => {
      const userId = await getUserIdFromSession(c.req.raw);

      if (!userId) {
        return c.json({ error: "Not authenticated" }, 401);
      }

      const { groupId } = c.req.valid("param");

      try {
        await db
          .delete(notificationGroup)
          .where(eq(notificationGroup.id, groupId));
        return c.json({ result: "success" });
      } catch (error) {
        console.error("Delete notification group error:", error);
        return c.json({ error: "Internal server error" }, 500);
      }
    }
  )
  // POST /api/notifications/test - Test notifications
  .post("/test", zValidator("json", TestNotificationsSchema), async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);

    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    const { queries } = c.req.valid("json");

    if (!queries.length) {
      return c.json({ count: 0 });
    }

    try {
      const links = await evaluateNotifications(
        userId,
        queries as NotificationQuery[]
      );
      return c.json({ count: links.length });
    } catch (error) {
      console.error("Test notifications error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // GET /api/notifications/groups/:notificationGroupId/feed - Get notification group feed data
  .get(
    "/groups/:notificationGroupId/feed",
    zValidator("param", GetNotificationGroupFeedSchema),
    async (c) => {
      const { notificationGroupId } = c.req.valid("param");

      try {
        const group = await db.query.notificationGroup.findFirst({
          where: and(
            eq(notificationGroup.id, notificationGroupId),
            isNotNull(notificationGroup.feedUrl)
          ),
          with: {
            items: {
              limit: 40,
              orderBy: desc(notificationItem.createdAt),
            },
          },
        });

        if (!group || !group.feedUrl || group.notificationType !== "rss") {
          return c.json({ error: "Feed not found" }, 404);
        }

        return c.json(group);
      } catch (error) {
        console.error("Get notification group feed error:", error);
        return c.json({ error: "Internal server error" }, 500);
      }
    }
  )
  // GET /api/notifications/groups - Get all notification groups for logged in user
  .get("/groups", async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);

    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    try {
      const groups = await db.query.notificationGroup.findMany({
        where: eq(notificationGroup.userId, userId),
      });

      return c.json(groups);
    } catch (error) {
      console.error("Get notification groups error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // POST /api/notifications/groups - Create or update notification group
  .post(
    "/groups",
    zValidator("json", CreateNotificationGroupSchema),
    async (c) => {
      const userId = await getUserIdFromSession(c.req.raw);

      if (!userId) {
        return c.json({ error: "Not authenticated" }, 401);
      }

      const { id, format, queries, name } = c.req.valid("json");

      try {
        let feedUrl: string | undefined = undefined;
        const groupId = id || uuidv7();

        if (format === "rss") {
          feedUrl = `https://sill.social/notifications/rss/${groupId}.rss`;
        }

        const result = await db
          .insert(notificationGroup)
          .values({
            id: groupId,
            name,
            notificationType: format,
            query: queries,
            feedUrl,
            userId,
          })
          .onConflictDoUpdate({
            target: [notificationGroup.id],
            set: {
              name,
              notificationType: format,
              query: queries,
              feedUrl,
              userId,
            },
          })
          .returning({
            id: notificationGroup.id,
          });

        return c.json({ success: true, id: result[0].id });
      } catch (error) {
        console.error("Create notification group error:", error);
        return c.json({ error: "Internal server error" }, 500);
      }
    }
  );

export default notifications;
