import { asc, eq, sql } from "drizzle-orm";
import {
	db,
	accountUpdateQueue,
	networkTopTenView,
	user,
	type bookmark,
	type notificationGroup,
} from "@sill/schema";
import {
	type ProcessedResult,
	insertNewLinks,
	dequeueJobs,
	enqueueJob,
	processUrl,
	updateBookmarkPosts,
	processJob,
	processNotificationGroup,
	getHighActivityUrls,
} from "@sill/links";

// Constants
const MAX_ERRORS_PER_BATCH = 10;
const JOB_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes
const CLOUDFLARE_RATE_LIMIT_MS = 1000; // 1 second between URL scrapes (Cloudflare requirement)
const QUEUE_POLL_INTERVAL_MS = 1000; // Poll queue every 1 second
const SLOW_QUEUE_DELAY_MS = 10 * 1000; // 10 seconds delay when few users

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
	allLinks: ProcessedResult[],
	notificationGroups: (typeof notificationGroup.$inferSelect)[],
	bookmarks: (typeof bookmark.$inferSelect)[],
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

		// Only push results if we got here (didn't timeout)
		allLinks.push(...result.links);
		notificationGroups.push(...result.notificationGroups);
		bookmarks.push(...result.bookmarks);

		return { status: "success", duration: Date.now() - jobStart };
	} catch (error) {
		console.error(
			`[Queue] Error processing job ${job.id} for user ${job.userId}:`,
			error,
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
	jobs: (typeof accountUpdateQueue.$inferSelect)[],
): Promise<void> {
	console.log(`[Queue] Processing batch of ${jobs.length} jobs`);
	const batchStart = Date.now();

	const allLinks: ProcessedResult[] = [];
	const notificationGroups: (typeof notificationGroup.$inferSelect)[] = [];
	const bookmarks: (typeof bookmark.$inferSelect)[] = [];

	// Process all jobs in parallel
	const results = await Promise.all(
		jobs.map((job) =>
			processJobWithTimeout(job, allLinks, notificationGroups, bookmarks),
		),
	);

	// Insert all new links
	await insertNewLinks(allLinks);

	// Process notifications sequentially
	for (const group of notificationGroups) {
		try {
			await processNotificationGroup(group);
		} catch (error) {
			console.error("[Queue] Error processing notification group:", error);
		}
	}

	// Update bookmarks sequentially
	for (const bookmark of bookmarks) {
		try {
			await updateBookmarkPosts(bookmark);
		} catch (error) {
			console.error("[Queue] Error updating bookmark:", error);
		}
	}

	// Log batch results
	const errorCount = results.filter((r) => r.status === "error").length;
	const successCount = results.filter((r) => r.status === "success").length;
	const batchDuration = Date.now() - batchStart;

	console.log(
		`[Queue] Batch complete: ${successCount} success, ${errorCount} errors, ${batchDuration}ms`,
	);

	// Exit if too many errors
	if (errorCount >= MAX_ERRORS_PER_BATCH) {
		console.error(
			`[Queue] Too many errors (${errorCount}/${MAX_ERRORS_PER_BATCH}), restarting process...`,
		);
		process.exit(1);
	}
}

/**
 * Handles idle queue state
 */
async function handleIdleQueue(batchSize: number): Promise<void> {
	// Refresh materialized view
	await db.refreshMaterializedView(networkTopTenView);

	// Scrape high-activity URLs with Cloudflare rate limiting
	const highActivityUrls = await getHighActivityUrls();
	if (highActivityUrls.length > 0) {
		console.log(`[BROWSER RENDER] scraping ${highActivityUrls.length} urls`);

		// Create promises with 1-second intervals between starts (Cloudflare requirement)
		const promises = highActivityUrls.map(
			(url, index) =>
				new Promise((resolve) =>
					setTimeout(
						() => resolve(processUrl(url)),
						index * CLOUDFLARE_RATE_LIMIT_MS,
					),
				),
		);

		await Promise.all(promises);
	}

	// Enqueue all users
	const users = await db.query.user.findMany({
		orderBy: asc(user.createdAt),
	});

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
				setTimeout(resolve, QUEUE_POLL_INTERVAL_MS),
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
