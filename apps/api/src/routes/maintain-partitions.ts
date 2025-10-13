import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "@sill/schema";

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

  await db.execute(sql`SELECT maintain_partitions()`);

  return Response.json({});
});

export default app;
