import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { runMigrations } from "./database/db.server.js";

// Import route modules
import auth from "./routes/auth.js";
import bluesky from "./routes/bluesky.js";
import links from "./routes/links.js";
import mastodon from "./routes/mastodon.js";

const app = new Hono()
	// Middleware
	.use("*", logger())
	.use(
		"*",
		cors({
			origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
			credentials: true,
		}),
	);

// Chain the route handlers for proper RPC type inference
const routes = app
	.route("/api/auth", auth)
	.route("/api/bluesky", bluesky)
	.route("/api/links", links)
	.route("/api/mastodon", mastodon);

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
