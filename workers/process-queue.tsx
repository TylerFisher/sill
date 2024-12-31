import { db } from "~/drizzle/db.server";
import { dequeueJobs, enqueueJob } from "~/utils/queue.server";
import {
	fetchLinks,
	insertNewLinks,
	evaluateNotifications,
	type ProcessedResult,
} from "~/utils/links.server";
import {
	accountUpdateQueue,
	notificationGroup,
	notificationItem,
	user,
} from "~/drizzle/schema.server";
import { asc, eq, sql } from "drizzle-orm";
import { renderReactEmail, sendEmail } from "~/utils/email.server";
import Notification from "~/emails/Notification";
import { renderToString } from "react-dom/server";
import RSSNotificationItem from "~/components/rss/RSSNotificationItem";
import { uuidv7 } from "uuidv7-js";

async function processQueue() {
	const BATCH_SIZE = Number.parseInt(process.env.UPDATE_BATCH_SIZE || "100");

	while (true) {
		const batchStart = Date.now();
		const jobs = await dequeueJobs(BATCH_SIZE);

		if (jobs.length > 0) {
			console.log(`[Queue] Processing batch of ${jobs.length} jobs`);
			const allLinks: ProcessedResult[] = [];
			const notificationGroups: (typeof notificationGroup.$inferSelect)[] = [];
			const results = await Promise.all(
				jobs.map(async (job) => {
					const jobStart = Date.now();
					try {
						const timeoutPromise = new Promise((_, reject) =>
							setTimeout(() => {
								reject(new Error("Job timed out after 120 seconds"));
							}, 120000),
						);
						const jobPromise = (async () => {
							const links = await fetchLinks(job.userId);
							allLinks.push(...links);

							const groups = await db.query.notificationGroup.findMany({
								where: eq(notificationGroup.userId, job.userId),
							});

							notificationGroups.push(...groups);
							await db
								.update(accountUpdateQueue)
								.set({
									status: "completed",
									processedAt: new Date(),
								})
								.where(eq(accountUpdateQueue.id, job.id));
						})();

						await Promise.race([timeoutPromise, jobPromise]);
						return { status: "success", duration: Date.now() - jobStart };
					} catch (error) {
						console.log(`Error for user ${job.userId}: ${error}`);

						await db
							.update(accountUpdateQueue)
							.set({
								status: "failed",
								error: String(error),
								retries: sql`${accountUpdateQueue.retries} + 1`,
							})
							.where(eq(accountUpdateQueue.id, job.id));

						return { status: "error", error, duration: Date.now() - jobStart };
					}
				}),
			);

			await insertNewLinks(allLinks);

			for (const group of notificationGroups) {
				const groupUser = await db.query.user.findFirst({
					where: eq(user.id, group.userId),
				});
				if (!groupUser) {
					continue;
				}
				const newItems = await evaluateNotifications(
					group.userId,
					group.query,
					group.seenLinks,
				);
				if (newItems.length > 0) {
					if (group.notificationType === "email") {
						const emailBody = {
							from: "Sill <noreply@e.sill.social>",
							to: groupUser.email,
							subject: `New notifications for ${group.name}`,
							"o:tag": "notification",
							...(await renderReactEmail(
								<Notification
									links={newItems}
									groupName={group.name}
									name={groupUser.name}
									digestUrl={`https://sill.social/notifications/${group.id}`}
								/>,
							)),
						};
						await sendEmail(emailBody);
					} else if (group.notificationType === "rss") {
						for (const item of newItems) {
							const html = renderToString(
								<RSSNotificationItem linkPost={item} />,
							);
							await db.insert(notificationItem).values({
								id: uuidv7(),
								notificationGroupId: group.id,
								itemHtml: html,
								itemData: item,
							});
						}
					}
				}
				await db
					.update(notificationGroup)
					.set({
						seenLinks: [
							...group.seenLinks,
							...newItems.map((n) => n.link?.url || ""),
						],
					})
					.where(eq(notificationGroup.id, group.id));
			}

			const batchDuration = Date.now() - batchStart;

			console.log(`[Queue] Batch complete:
      Processed: ${jobs.length}
      Success: ${results.filter((r) => r.status === "success").length}
      Errors: ${results.filter((r) => r.status === "error").length}
      Batch Duration: ${batchDuration}ms
    `);
		} else {
			if (process.env.NODE_ENV === "production") {
				const users = await db.query.user.findMany({
					orderBy: asc(user.createdAt),
				});

				await Promise.all(users.map((user) => enqueueJob(user.id)));
				console.log(`[Queue] No jobs found, enqueued ${users.length} users`);
			}
		}

		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	processQueue().catch(console.error);
}
