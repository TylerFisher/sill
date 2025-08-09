import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { uuidv7 } from "uuidv7-js";
import { z } from "zod";
import { getUserIdFromSession } from "../auth/auth.server.js";
import { db } from "../database/db.server.js";
import {
	digestItem,
	digestLayout,
	digestRssFeed,
	digestSettings,
	digestType,
	user,
} from "../database/schema.server.js";

// Schema for email settings
const EmailSettingsSchema = z.object({
	time: z.string(),
	hideReposts: z.boolean().default(false),
	splitServices: z.boolean().default(false),
	topAmount: z.number().default(10),
	layout: z.string().default("default"),
	digestType: z.string(),
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
			const itemsByMonth = items.reduce(
				(acc, item) => {
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
				},
				{} as Record<
					string,
					{ month: string; year: number; items: typeof items }
				>,
			);

			return c.json({
				success: true,
				itemsByMonth,
			});
		} catch (error) {
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
		} catch (error) {
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
			const host =
				c.req.header("X-Forwarded-Host") ||
				c.req.header("Host") ||
				"localhost:3000";
			const proto = c.req.header("X-Forwarded-Proto") || "http";
			const baseUrl = `${proto}://${host}/digest`;

			const submittedDigestType = digestType.enumValues.find(
				(value) => value === formData.digestType,
			);

			const submittedLayout = digestLayout.enumValues.find(
				(value) => value === formData.layout,
			);

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
		} catch (error) {
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
		} catch (error) {
			console.error("Delete digest settings error:", error);
			return c.json({ error: "Internal server error" }, 500);
		}
	});

export default digest;
