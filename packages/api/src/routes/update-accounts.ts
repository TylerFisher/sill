import { asc } from "drizzle-orm";
import { Hono } from "hono";
import { user, db } from "@sill/schema";
import { enqueueJob } from "../utils/queue.server.js";

const app = new Hono();

app.get("/", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.text("Unauthorized", 401);
  }

  const token = authHeader.split(" ")[1];
  if (token !== process.env.CRON_API_KEY) {
    return c.text("Forbidden", 403);
  }

  const users = await db.query.user.findMany({
    orderBy: asc(user.createdAt),
  });

  await Promise.all(users.map((user) => enqueueJob(user.id)));

  return c.json({ queued: users.length });
});

export default app;
