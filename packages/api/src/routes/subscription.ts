import { and, eq, not } from "drizzle-orm";
import { Hono } from "hono";
import { uuidv7 } from "uuidv7-js";
import { getUserIdFromSession } from "@sill/auth";
import { db, subscription, user } from "@sill/schema";
import { conflictUpdateSetAllColumns } from "@sill/links";
import { bootstrapProducts } from "../utils/polar.server";

// Type definition for the webhook payload (from Polar SDK)
interface WebhookCustomerStateChangedPayload {
  type: "customer.state_changed";
  data: {
    id: string;
    externalId?: string;
    email?: string;
    activeSubscriptions: Array<{
      id: string;
      productId: string;
      currentPeriodEnd: string;
      currentPeriodStart: string;
      cancelAtPeriodEnd: boolean;
      status: string;
    }>;
  };
}

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
          not(eq(subscription.status, "canceled"))
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
          eq(subscription.status, "active")
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
  })
  // POST /api/subscription/webhook - Handle Polar customer state changed webhook payload
  .post("/webhook", async (c) => {
    try {
      const payload: WebhookCustomerStateChangedPayload = await c.req.json();
      let foundUsers: { id: string }[] = [];

      // Set Polar customer ID
      if (payload.data.externalId) {
        foundUsers = await db
          .update(user)
          .set({
            customerId: payload.data.id,
          })
          .where(eq(user.id, payload.data.externalId))
          .returning({
            id: user.id,
          });
      } else if (payload.data.email) {
        console.log(
          "[POLAR WEBHOOK] No external ID found, falling back to email matching"
        );
        foundUsers = await db
          .update(user)
          .set({
            customerId: payload.data.id,
          })
          .where(eq(user.email, payload.data.email))
          .returning({
            id: user.id,
          });
      } else {
        console.error(
          "[POLAR WEBHOOK] Neither external ID nor email available in payload"
        );
        return c.json({ error: "Invalid payload" }, 400);
      }

      if (foundUsers.length === 0) {
        console.error(
          "[POLAR WEBHOOK] Could not find user via external ID or email"
        );
        return c.json({ error: "User not found" }, 404);
      }

      const dbUser = foundUsers[0];

      // Update lapsed subs
      if (payload.data.activeSubscriptions.length === 0) {
        await db
          .update(subscription)
          .set({
            status: "canceled",
          })
          .where(
            and(
              eq(subscription.userId, dbUser.id),
              eq(subscription.status, "active")
            )
          );

        return c.json({ success: true });
      }

      // Update active subs
      const sillProducts = await db.query.polarProduct.findMany();
      const polarSubscription = payload.data.activeSubscriptions.find((sub) =>
        sillProducts.some((product) => product.polarId === sub.productId)
      );

      if (!polarSubscription) {
        console.error("[POLAR WEBHOOK] No valid subscription");
        return c.json({ error: "No valid subscription" }, 400);
      }

      const chosenProduct = sillProducts.find(
        (product) => product.polarId === polarSubscription.productId
      );

      if (!chosenProduct) {
        console.error("[POLAR WEBHOOK] Product not found");
        return c.json({ error: "Product not found" }, 404);
      }

      await db
        .insert(subscription)
        .values({
          id: uuidv7(),
          userId: dbUser.id,
          polarId: polarSubscription.id,
          polarProductId: chosenProduct.id,
          periodEnd: new Date(polarSubscription.currentPeriodEnd),
          periodStart: new Date(polarSubscription.currentPeriodStart),
          cancelAtPeriodEnd: polarSubscription.cancelAtPeriodEnd,
          status: polarSubscription.status || "",
        })
        .onConflictDoUpdate({
          target: subscription.polarId,
          set: {
            ...conflictUpdateSetAllColumns(subscription),
          },
        });

      return c.json({ success: true });
    } catch (error) {
      console.error("[POLAR WEBHOOK] Webhook processing error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

export default subscriptions;
