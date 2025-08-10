import { zValidator } from "@hono/zod-validator";
import { and, eq, not } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { uuidv7 } from "uuidv7-js";
import { getUserIdFromSession } from "../auth/auth.server.js";
import { db } from "../database/db.server.js";
import { polarProduct, subscription, user } from "../database/schema.server.js";
import { bootstrapProducts } from "../utils/polar.server.js";
import { conflictUpdateSetAllColumns } from "../utils/links.server.js";


const subscriptions = new Hono()
	// GET /api/subscription/current - Get current (non-canceled) subscription for user
	.get("/current", async (c) => {
		const userId = await getUserIdFromSession(c.req.raw);

		if (!userId) {
			return c.json({ error: "Not authenticated" }, 401);
		}

		try {
			const currentSubscription = await db.query.subscription.findFirst({
				where: and(
					eq(subscription.userId, userId),
					not(eq(subscription.status, "canceled")),
				),
				with: {
					polarProduct: true,
				},
			});

			return c.json({ subscription: currentSubscription });
		} catch (error) {
			console.error("Get current subscription error:", error);
			return c.json({ error: "Internal server error" }, 500);
		}
	})
	// GET /api/subscription/active - Get specifically active subscription for user
	.get("/active", async (c) => {
		const userId = await getUserIdFromSession(c.req.raw);

		if (!userId) {
			return c.json({ error: "Not authenticated" }, 401);
		}

		try {
			const activeSubscription = await db.query.subscription.findFirst({
				where: and(
					eq(subscription.userId, userId),
					eq(subscription.status, "active"),
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
	})
	// POST /api/subscription/seed - Bootstrap polar products (admin/cron only)
	.post("/seed", async (c) => {
		// Check authorization header
		const authHeader = c.req.header("Authorization");
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const token = authHeader.split(" ")[1];
		if (token !== process.env.CRON_API_KEY) {
			return c.json({ error: "Forbidden" }, 403);
		}

		try {
			await bootstrapProducts();
			return c.json({ success: true });
		} catch (error) {
			console.error("Bootstrap products error:", error);
			return c.json({ error: "Internal server error" }, 500);
		}
	});

export default subscriptions;