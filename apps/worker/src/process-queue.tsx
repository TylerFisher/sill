import { asc, eq, sql } from "drizzle-orm";
import {
  db,
  accountUpdateQueue,
  notificationGroup,
  user,
} from "@sill/schema";
import {
  dequeueJobs,
  enqueueJob,
  processJob,
  processNotificationGroup,
  clearUrlExpansionCache,
  type PushShareBatch,
  pushShareBatches,
} from "@sill/links";

// Constants
const MAX_ERRORS_PER_BATCH = 50;
const JOB_TIMEOUT_MS = 2 * 60 * 1000; // 3 minutes
const QUEUE_POLL_INTERVAL_MS = 10 * 1000; // 10 seconds between batches
const SLOW_QUEUE_DELAY_MS = 120 * 1000; // 2 minute delay when few users

type JobResult =
  | { status: "success"; duration: number }
  | { status: "error"; error: unknown; duration: number };

// Graceful shutdown support
let isShuttingDown = false;

process.on("SIGTERM", () => {
  console.log("[Queue] Received SIGTERM, shutting down gracefully...");
  isShuttingDown = true;
});

process.on("SIGINT", () => {
  console.log("[Queue] Received SIGINT, shutting down gracefully...");
  isShuttingDown = true;
});

/**
 * Processes a single job with timeout protection
 */
async function processJobWithTimeout(
  job: typeof accountUpdateQueue.$inferSelect,
  shareBatches: PushShareBatch[],
  notificationGroups: (typeof notificationGroup.$inferSelect)[]
): Promise<JobResult> {
  const jobStart = Date.now();
  let timeoutId: NodeJS.Timeout | undefined;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error("Job timed out after 3 minutes"));
      }, JOB_TIMEOUT_MS);
    });

    const result = await Promise.race([timeoutPromise, processJob(job)]);

    // Per-job shares accumulate here; the batch flushes once at the end via
    // `pushShareBatches` so the whole worker pass is one HTTP request.
    if (result.shareBatch) shareBatches.push(result.shareBatch);
    notificationGroups.push(...result.notificationGroups);

    return { status: "success", duration: Date.now() - jobStart };
  } catch (error) {
    console.error(
      `[Queue] Error processing job ${job.id} for user ${job.userId}:`,
      error
    );

    await db
      .update(accountUpdateQueue)
      .set({
        status: "failed",
        error: String(error),
        retries: sql`${accountUpdateQueue.retries} + 1`,
      })
      .where(eq(accountUpdateQueue.id, job.id));

    return { status: "error", error, duration: Date.now() - jobStart };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * Processes a batch of jobs
 */
async function processBatch(
  jobs: (typeof accountUpdateQueue.$inferSelect)[]
): Promise<void> {
  console.log(`[Queue] Processing batch of ${jobs.length} jobs`);
  const batchStart = Date.now();

  const shareBatches: PushShareBatch[] = [];
  const notificationGroups: (typeof notificationGroup.$inferSelect)[] = [];

  // Process all jobs in parallel. Each job collects its viewer's shares; we
  // POST `/v1/shares` once for the whole batch in the AppView's batched form.
  const results = await Promise.all(
    jobs.map((job) =>
      processJobWithTimeout(job, shareBatches, notificationGroups)
    )
  );

  // Single batched POST per worker pass — saves ~200 ms / pass vs. one POST
  // per viewer (API.md §POST /v1/shares "Batched form").
  if (shareBatches.length > 0) {
    await pushShareBatches(shareBatches);
  }

  // Process notifications sequentially
  for (const group of notificationGroups) {
    try {
      await processNotificationGroup(group);
    } catch (error) {
      console.error("[Queue] Error processing notification group:", error);
    }
  }

  clearUrlExpansionCache();

  // Log batch results
  const errorCount = results.filter((r) => r.status === "error").length;
  const successCount = results.filter((r) => r.status === "success").length;
  const batchDuration = Date.now() - batchStart;

  console.log(
    `[Queue] Batch complete: ${successCount} success, ${errorCount} errors, ${batchDuration}ms`
  );

  // Exit if too many errors
  if (errorCount >= MAX_ERRORS_PER_BATCH) {
    console.error(
      `[Queue] Too many errors (${errorCount}/${MAX_ERRORS_PER_BATCH}), restarting process...`
    );
    process.exit(1);
  }
}

/**
 * Handles idle queue state
 */
async function handleIdleQueue(batchSize: number): Promise<void> {
  const usersWithAccounts = await db.query.user.findMany({
    with: {
      blueskyAccounts: { with: { lists: true } },
      mastodonAccounts: true,
    },
    orderBy: asc(user.createdAt),
  });

  // Users with notification groups must be ingested every cycle so their
  // notifications evaluate against fresh data (notifications read the DB).
  const notificationUserIds = new Set(
    (
      await db
        .selectDistinct({ userId: notificationGroup.userId })
        .from(notificationGroup)
    ).map((row) => row.userId)
  );

  // The AppView now serves the Bluesky following timeline, so the worker only
  // needs to fetch for users with something it doesn't cover: Bluesky lists
  // (custom feeds), a Mastodon account, or notification groups to evaluate.
  const users = usersWithAccounts.filter(
    (u) =>
      u.mastodonAccounts.length > 0 ||
      u.blueskyAccounts.some((account) => account.lists.length > 0) ||
      notificationUserIds.has(u.id)
  );

  // Delete completed jobs
  await db
    .delete(accountUpdateQueue)
    .where(eq(accountUpdateQueue.status, "completed"));

  // Enqueue users in parallel
  await Promise.all(users.map((u) => enqueueJob(u.id)));
  console.log(`[Queue] No jobs found, enqueued ${users.length} users`);

  // Slow down if few users
  if (users.length < batchSize) {
    await new Promise((resolve) => setTimeout(resolve, SLOW_QUEUE_DELAY_MS));
  }
}

/**
 * Main queue processing loop
 */
async function processQueue() {
  const BATCH_SIZE = Number.parseInt(process.env.UPDATE_BATCH_SIZE || "100");

  console.log(`[Queue] Starting with batch size ${BATCH_SIZE}`);

  while (!isShuttingDown) {
    try {
      const jobs = await dequeueJobs(BATCH_SIZE);

      if (jobs.length > 0) {
        await processBatch(jobs);
      } else {
        await handleIdleQueue(BATCH_SIZE);
      }

      // Wait before next poll
      await new Promise((resolve) =>
        setTimeout(resolve, QUEUE_POLL_INTERVAL_MS)
      );
    } catch (error) {
      console.error("[Queue] Unexpected error in main loop:", error);
      // Continue processing despite errors in individual iterations
    }
  }

  console.log("[Queue] Shutdown complete");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  processQueue().catch((error) => {
    console.error("[Queue] Fatal error:", error);
    process.exit(1);
  });
}
