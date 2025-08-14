import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { uuidv7 } from "uuidv7-js";
import { z } from "zod";
import { getUserIdFromSession } from "@sill/auth";
import { db, digestItem, digestLayout, digestRssFeed, digestSettings, digestType, user, } from "@sill/schema";
// Schema for email settings
const EmailSettingsSchema = z.object({
    time: z.string(),
    hideReposts: z.boolean().default(false),
    splitServices: z.boolean().default(false),
    topAmount: z.number().default(10),
    layout: z.string().default("default"),
    digestType: z.string(),
});
// Schema for feed by user ID
const FeedByUserIdSchema = z.object({
    userId: z.string().uuid(),
});
// Schema for individual digest item
const DigestItemSchema = z.object({
    itemId: z.string().uuid(),
});
const digest = new Hono()
    // GET /api/digest/by-month - Get digest items grouped by month for a user
    .get("/by-month", async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);
    if (!userId) {
        return c.json({ error: "Not authenticated" }, 401);
    }
    try {
        // Get all digest items for the user
        const items = await db.query.digestItem.findMany({
            columns: {
                id: true,
                pubDate: true,
            },
            where: eq(digestItem.userId, userId),
            orderBy: desc(digestItem.pubDate),
        });
        // Group items by month
        const itemsByMonth = items.reduce((acc, item) => {
            const date = new Date(item.pubDate);
            const monthYear = `${date.getFullYear()}-${date.getMonth()}`;
            if (!acc[monthYear]) {
                acc[monthYear] = {
                    month: date.toLocaleString("default", { month: "long" }),
                    year: date.getFullYear(),
                    items: [],
                };
            }
            acc[monthYear].items.push(item);
            return acc;
        }, {});
        return c.json({
            success: true,
            itemsByMonth,
        });
    }
    catch (error) {
        console.error("Get digest items by month error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
})
    // GET /api/digest/settings - Get digest settings for a user
    .get("/settings", async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);
    if (!userId) {
        return c.json({ error: "Not authenticated" }, 401);
    }
    try {
        const currentSettings = await db.query.digestSettings.findFirst({
            where: eq(digestSettings.userId, userId),
        });
        return c.json({
            success: true,
            settings: currentSettings,
        });
    }
    catch (error) {
        console.error("Get digest settings error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
})
    // POST /api/digest/settings - Create or update digest settings
    .post("/settings", zValidator("json", EmailSettingsSchema), async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);
    if (!userId) {
        return c.json({ error: "Not authenticated" }, 401);
    }
    const formData = c.req.valid("json");
    try {
        // Get user info for RSS feed title
        const existingUser = await db.query.user.findFirst({
            where: eq(user.id, userId),
        });
        // Get host from headers for RSS feed URL
        const host = c.req.header("X-Forwarded-Host") ||
            c.req.header("Host") ||
            "localhost:3000";
        const proto = c.req.header("X-Forwarded-Proto") || "http";
        const baseUrl = `${proto}://${host}/digest`;
        const submittedDigestType = digestType.enumValues.find((value) => value === formData.digestType);
        const submittedLayout = digestLayout.enumValues.find((value) => value === formData.layout);
        if (!submittedDigestType || !submittedLayout) {
            return c.json({ error: "Invalid digest type or layout" }, 400);
        }
        const settings = await db
            .insert(digestSettings)
            .values({
            id: uuidv7(),
            userId,
            scheduledTime: formData.time,
            hideReposts: formData.hideReposts,
            splitServices: formData.splitServices,
            topAmount: formData.topAmount,
            layout: submittedLayout,
            digestType: submittedDigestType,
        })
            .onConflictDoUpdate({
            target: [digestSettings.userId],
            set: {
                scheduledTime: formData.time,
                hideReposts: formData.hideReposts,
                splitServices: formData.splitServices,
                topAmount: formData.topAmount,
                layout: submittedLayout,
                digestType: submittedDigestType,
            },
        })
            .returning({
            id: digestSettings.id,
        });
        if (submittedDigestType === "rss") {
            await db
                .insert(digestRssFeed)
                .values({
                id: uuidv7(),
                userId,
                digestSettings: settings[0].id,
                feedUrl: `${baseUrl}/${userId}.rss`,
                title: `Sill Digest for ${existingUser?.name}`,
                description: "Daily links from your personal social network",
            })
                .onConflictDoUpdate({
                target: [digestRssFeed.digestSettings],
                set: {
                    feedUrl: `${baseUrl}/${userId}.rss`,
                    title: `Sill Digest for ${existingUser?.name}`,
                    description: "Daily links from your personal social network",
                },
            });
        }
        return c.json({
            success: true,
            settings: settings[0],
        });
    }
    catch (error) {
        console.error("Create/update digest settings error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
})
    // DELETE /api/digest/settings - Delete digest settings
    .delete("/settings", async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);
    if (!userId) {
        return c.json({ error: "Not authenticated" }, 401);
    }
    try {
        await db.delete(digestSettings).where(eq(digestSettings.userId, userId));
        return c.json({
            success: true,
        });
    }
    catch (error) {
        console.error("Delete digest settings error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
})
    // GET /api/digest/feed/:userId - Get digest feed data for RSS generation
    .get("/feed/:userId", zValidator("param", FeedByUserIdSchema), async (c) => {
    const { userId } = c.req.valid("param");
    try {
        // Get user info
        const existingUser = await db.query.user.findFirst({
            where: eq(user.id, userId),
            columns: {
                id: true,
                name: true,
            },
        });
        if (!existingUser) {
            return c.json({ error: "User not found" }, 404);
        }
        // Get digest feed with items
        const feedWithItems = await db.query.digestRssFeed.findFirst({
            where: eq(digestRssFeed.userId, userId),
            columns: {
                title: true,
                description: true,
                feedUrl: true,
            },
            with: {
                items: {
                    limit: 10,
                    orderBy: desc(digestItem.pubDate),
                    columns: {
                        id: true,
                        title: true,
                        description: true,
                        html: true,
                        pubDate: true,
                    },
                },
            },
        });
        if (!feedWithItems) {
            return c.json({ error: "Feed not found" }, 404);
        }
        return c.json({
            success: true,
            user: existingUser,
            feed: {
                title: feedWithItems.title,
                description: feedWithItems.description,
                feedUrl: feedWithItems.feedUrl,
                items: feedWithItems.items,
            },
        });
    }
    catch (error) {
        console.error("Get digest feed error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
})
    // GET /api/digest/item/:itemId - Get individual digest item
    .get("/item/:itemId", zValidator("param", DigestItemSchema), async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);
    if (!userId) {
        return c.json({ error: "Not authenticated" }, 401);
    }
    const { itemId } = c.req.valid("param");
    try {
        // Get digest item
        const feedItem = await db.query.digestItem.findFirst({
            where: and(eq(digestItem.id, itemId), eq(digestItem.userId, userId)),
            columns: {
                id: true,
                json: true,
                pubDate: true,
                userId: true,
            },
        });
        if (!feedItem || !feedItem.json) {
            return c.json({ error: "Feed item not found" }, 404);
        }
        return c.json({
            success: true,
            feedItem: {
                id: feedItem.id,
                json: feedItem.json,
                pubDate: feedItem.pubDate,
            },
        });
    }
    catch (error) {
        console.error("Get digest item error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
export default digest;
