import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, gte, or } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { getUserIdFromSession } from "@sill/auth";
import { db, syncJob } from "@sill/schema";
import { uuidv7 } from "uuidv7-js";

/**
 * Get active and recently completed syncs for a user
 * Exported for use by other routes (e.g., auth profile)
 */
export async function getActiveSyncs(userId: string) {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const syncs = await db.query.syncJob.findMany({
    where: and(
      eq(syncJob.userId, userId),
      or(
        eq(syncJob.status, "syncing"),
        gte(syncJob.completedAt, fiveMinutesAgo),
      ),
    ),
    orderBy: desc(syncJob.createdAt),
    limit: 10,
  });

  return syncs.map((s) => ({
    syncId: s.syncId,
    label: s.label,
    status: s.status,
  }));
}

const StartSyncSchema = z.object({
  syncId: z.string().min(1),
  label: z.string().min(1),
});

const UpdateSyncSchema = z.object({
  syncId: z.string().min(1),
  status: z.enum(["success", "error"]),
  error: z.string().optional(),
});

const sync = new Hono()
  // POST /api/sync/start - Register a new sync job
  .post("/start", zValidator("json", StartSyncSchema), async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);

    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    const { syncId, label } = c.req.valid("json");

    try {
      const result = await db
        .insert(syncJob)
        .values({
          id: uuidv7(),
          userId,
          syncId,
          label,
          status: "syncing",
        })
        .returning();

      return c.json({ success: true, job: result[0] });
    } catch (error) {
      console.error("Start sync error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // POST /api/sync/complete - Mark a sync job as complete
  .post("/complete", zValidator("json", UpdateSyncSchema), async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);

    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    const { syncId, status, error: errorMsg } = c.req.valid("json");

    try {
      const result = await db
        .update(syncJob)
        .set({
          status,
          completedAt: new Date(),
          error: errorMsg,
        })
        .where(and(eq(syncJob.userId, userId), eq(syncJob.syncId, syncId)))
        .returning();

      if (result.length === 0) {
        return c.json({ error: "Sync job not found" }, 404);
      }

      return c.json({ success: true, job: result[0] });
    } catch (error) {
      console.error("Complete sync error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // GET /api/sync/status/:syncId - Get status of a specific sync job
  .get("/status/:syncId", async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);

    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    const syncId = c.req.param("syncId");

    try {
      const result = await db.query.syncJob.findFirst({
        where: and(eq(syncJob.userId, userId), eq(syncJob.syncId, syncId)),
        orderBy: desc(syncJob.createdAt),
      });

      if (!result) {
        return c.json({ error: "Sync job not found" }, 404);
      }

      return c.json(result);
    } catch (error) {
      console.error("Get sync status error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // GET /api/sync/all - Get all active and recently completed syncs
  .get("/all", async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);

    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    try {
      const syncs = await getActiveSyncs(userId);
      return c.json(syncs);
    } catch (error) {
      console.error("Get syncs error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

export default sync;
