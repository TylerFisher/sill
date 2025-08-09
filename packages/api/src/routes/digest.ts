import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { getUserIdFromSession } from "../auth/auth.server.js";
import { db } from "../database/db.server.js";
import { digestItem, digestSettings } from "../database/schema.server.js";

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
	});

export default digest;
