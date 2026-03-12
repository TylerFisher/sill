import { zValidator } from "@hono/zod-validator";
import { getUserIdFromSession } from "@sill/auth";
import { db, deviceToken } from "@sill/schema";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { uuidv7 } from "uuidv7-js";
import { z } from "zod";

const RegisterDeviceSchema = z.object({
	token: z.string().min(1),
	platform: z.string().default("ios"),
});

const UnregisterDeviceSchema = z.object({
	token: z.string().min(1),
});

const devices = new Hono()
	// POST /api/devices/register - Register a device token
	.post("/register", zValidator("json", RegisterDeviceSchema), async (c) => {
		const userId = await getUserIdFromSession(c.req.raw);

		if (!userId) {
			return c.json({ error: "Not authenticated" }, 401);
		}

		const { token, platform } = c.req.valid("json");

		try {
			await db
				.insert(deviceToken)
				.values({
					id: uuidv7(),
					userId,
					token,
					platform,
				})
				.onConflictDoUpdate({
					target: [deviceToken.userId, deviceToken.token],
					set: {
						platform,
					},
				});

			return c.json({ success: true });
		} catch (error) {
			console.error("Register device error:", error);
			return c.json({ error: "Internal server error" }, 500);
		}
	})
	// DELETE /api/devices/unregister - Remove a device token
	.delete(
		"/unregister",
		zValidator("json", UnregisterDeviceSchema),
		async (c) => {
			const userId = await getUserIdFromSession(c.req.raw);

			if (!userId) {
				return c.json({ error: "Not authenticated" }, 401);
			}

			const { token } = c.req.valid("json");

			try {
				await db
					.delete(deviceToken)
					.where(
						and(eq(deviceToken.userId, userId), eq(deviceToken.token, token)),
					);

				return c.json({ success: true });
			} catch (error) {
				console.error("Unregister device error:", error);
				return c.json({ error: "Internal server error" }, 500);
			}
		},
	)
	// GET /api/devices - List registered devices for the current user
	.get("/", async (c) => {
		const userId = await getUserIdFromSession(c.req.raw);

		if (!userId) {
			return c.json({ error: "Not authenticated" }, 401);
		}

		try {
			const tokens = await db.query.deviceToken.findMany({
				where: eq(deviceToken.userId, userId),
			});

			return c.json(tokens);
		} catch (error) {
			console.error("List devices error:", error);
			return c.json({ error: "Internal server error" }, 500);
		}
	});

export default devices;
