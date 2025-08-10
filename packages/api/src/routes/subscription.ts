import { and, eq, not } from "drizzle-orm";
import { Hono } from "hono";
import { getUserIdFromSession } from "../auth/auth.server.js";
import { db } from "../database/db.server.js";
import { polarProduct, subscription } from "../database/schema.server.js";

const subscriptions = new Hono()
	// GET /api/subscription/active - Get active subscription for user
	.get("/active", async (c) => {
		const userId = await getUserIdFromSession(c.req.raw);

		if (!userId) {
			return c.json({ error: "Not authenticated" }, 401);
		}

		try {
			const activeSubscription = await db.query.subscription.findFirst({
				where: and(
					eq(subscription.userId, userId),
					not(eq(subscription.status, "canceled")),
				),
				with: {
					polarProduct: true,
				},
			});

			return c.json({ subscription: activeSubscription });
		} catch (error) {
			console.error("Get active subscription error:", error);
			return c.json({ error: "Internal server error" }, 500);
		}
	})
	// GET /api/subscription/products - Get all available polar products
	.get("/products", async (c) => {
		try {
			const products = await db.query.polarProduct.findMany();
			return c.json({ products });
		} catch (error) {
			console.error("Get polar products error:", error);
			return c.json({ error: "Internal server error" }, 500);
		}
	});

export default subscriptions;