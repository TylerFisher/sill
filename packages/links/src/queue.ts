import { and, eq, inArray, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7-js";
import {
  db,
  accountUpdateQueue,
  blueskyAccount,
  list,
  mastodonAccount,
  notificationGroup,
} from "@sill/schema";
import { fetchLinks } from "./links.js";
import { clearOAuthSessionCache } from "./bluesky.js";

export async function enqueueJob(userId: string) {
  return await db
    .insert(accountUpdateQueue)
    .values({
      id: uuidv7(),
      userId,
    })
    .returning();
}

export async function dequeueJobs(batchSize: number) {
  return await db.transaction(async (tx) => {
    const jobs = await tx
      .select()
      .from(accountUpdateQueue)
      .where(
        and(
          eq(accountUpdateQueue.status, "pending"),
          sql`${accountUpdateQueue.retries} < 3`,
        ),
      )
      .limit(batchSize)
      .for("update", { skipLocked: true });

    if (jobs.length > 0) {
      await tx
        .update(accountUpdateQueue)
        .set({ status: "processing" })
        .where(
          inArray(
            accountUpdateQueue.id,
            jobs.map((j) => j.id),
          ),
        );
    }

    return jobs;
  });
}

interface ProcessJobResult {
  shareBatch: Awaited<ReturnType<typeof import("./links.js").fetchLinks>>;
  notificationGroups: Awaited<
    ReturnType<typeof db.query.notificationGroup.findMany>
  >;
}

/**
 * Processes a single job by fetching links and notification groups for a user.
 * Marks the job as completed upon success.
 */
/**
 * Whether `fetchLinks` would actually ingest anything for this user. The
 * worker no longer ingests the Bluesky following timeline (the AppView serves
 * it), so a user with no Mastodon account and no Bluesky lists has nothing for
 * `fetchLinks` to pull — skip the OAuth restore / agent spin-up and go
 * straight to evaluating their notifications against the AppView.
 */
async function hasIngestionSources(userId: string): Promise<boolean> {
  const [mastodon, blueskyList] = await Promise.all([
    db
      .select({ id: mastodonAccount.id })
      .from(mastodonAccount)
      .where(eq(mastodonAccount.userId, userId))
      .limit(1),
    db
      .select({ id: list.id })
      .from(list)
      .innerJoin(blueskyAccount, eq(list.blueskyAccountId, blueskyAccount.id))
      .where(eq(blueskyAccount.userId, userId))
      .limit(1),
  ]);
  return mastodon.length > 0 || blueskyList.length > 0;
}

export async function processJob(
  job: typeof accountUpdateQueue.$inferSelect,
): Promise<ProcessJobResult> {
  const needsIngestion = await hasIngestionSources(job.userId);
  // `fetchLinks` collects shares (no DB writes); the worker accumulates
  // batches across the pass and flushes once via `pushShareBatches`.
  const shareBatch = needsIngestion ? await fetchLinks(job.userId) : null;

  const groups = await db.query.notificationGroup.findMany({
    where: eq(notificationGroup.userId, job.userId),
  });

  await db
    .update(accountUpdateQueue)
    .set({
      status: "completed",
      processedAt: new Date(),
    })
    .where(eq(accountUpdateQueue.id, job.id));

  return {
    shareBatch,
    notificationGroups: groups,
  };
}
