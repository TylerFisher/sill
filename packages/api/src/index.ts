import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { runMigrations } from "@sill/schema";

// Import route modules
import auth from "./routes/auth";
import bluesky from "./routes/bluesky";
import bookmarks from "./routes/bookmarks";
import digest from "./routes/digest";
import links from "./routes/links";
import lists from "./routes/lists";
import maintainPartitions from "./routes/maintain-partitions";
import mastodon from "./routes/mastodon";
import mute from "./routes/mute";
import newsletter from "./routes/newsletter";
import notifications from "./routes/notifications";
import subscription from "./routes/subscription";
import terms from "./routes/terms";
import updateAccounts from "./routes/update-accounts";

const app = new Hono()
  // Middleware
  .use("*", logger())
  .use(
    "*",
    cors({
      origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
      credentials: true,
    })
  );

// Chain the route handlers for proper RPC type inference
const routes = app
  .route("/api/auth", auth)
  .route("/api/bluesky", bluesky)
  .route("/api/bookmarks", bookmarks)
  .route("/api/digest", digest)
  .route("/api/links", links)
  .route("/api/lists", lists)
  .route("/api/maintain-partitions", maintainPartitions)
  .route("/api/mastodon", mastodon)
  .route("/api/mute", mute)
  .route("/api/newsletter", newsletter)
  .route("/api/notifications", notifications)
  .route("/api/subscription", subscription)
  .route("/api/terms", terms)
  .route("/api/update-accounts", updateAccounts);

const port = Number.parseInt(process.env.API_PORT || "3001", 10);

console.log(`🚀 Hono API server starting on port ${port}`);

// Run migrations before starting server
try {
  await runMigrations();
  console.log("✅ Database migrations completed");
} catch (error) {
  console.error("❌ Migration failed:", error);
  process.exit(1);
}

serve({
  fetch: routes.fetch,
  port,
});

export default app;
export type AppType = typeof routes;
