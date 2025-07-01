import { db } from "~/drizzle/db.server";
import { dequeueJobs, enqueueJob } from "~/utils/queue.server";
import {
	fetchLinks,
	insertNewLinks,
	evaluateNotifications,
	type ProcessedResult,
	filterLinkOccurrences,
} from "~/utils/links.server";
import {
	accountUpdateQueue,
	bookmark,
	link,
	linkPostDenormalized,
	networkTopTenView,
	notificationGroup,
	notificationItem,
	user,
} from "~/drizzle/schema.server";
import { and, asc, count, eq, gte, ilike, is, not, sql } from "drizzle-orm";
import { renderReactEmail, sendEmail } from "~/utils/email.server";
import Notification from "~/emails/Notification";
import { renderToString } from "react-dom/server";
import RSSNotificationItem from "~/components/rss/RSSNotificationItem";
import { uuidv7 } from "uuidv7-js";
import { isSubscribed } from "~/utils/auth.server";
import {
	extractHtmlMetadata,
	renderPageContent,
} from "~/utils/cloudflare.server";

const MAX_ERRORS_PER_BATCH = 10;

async function processQueue() {
	const BATCH_SIZE = Number.parseInt(process.env.UPDATE_BATCH_SIZE || "100");

	while (true) {
		const batchStart = Date.now();
		const jobs = await dequeueJobs(BATCH_SIZE);

		if (jobs.length > 0) {
			console.log(`[Queue] Processing batch of ${jobs.length} jobs`);
			const allLinks: ProcessedResult[] = [];
			const notificationGroups: (typeof notificationGroup.$inferSelect)[] = [];
			const bookmarks: (typeof bookmark.$inferSelect)[] = [];
			const results = await Promise.all(
				jobs.map(async (job) => {
					const jobStart = Date.now();
					try {
						const timeoutPromise = new Promise((_, reject) => {
							const timer = setTimeout(() => {
								reject(new Error("Job timed out after 3 minutes"));
							}, 180000);
							// Clear timer when promise resolves
							return () => clearTimeout(timer);
						});
						const jobPromise = (async () => {
							const links = await fetchLinks(job.userId);
							allLinks.push(...links);

							const groups = await db.query.notificationGroup.findMany({
								where: eq(notificationGroup.userId, job.userId),
							});

							const userBookmarks = await db.query.bookmark.findMany({
								where: eq(bookmark.userId, job.userId),
							});

							notificationGroups.push(...groups);
							bookmarks.push(...userBookmarks);
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
					with: { subscriptions: true },
				});
				if (!groupUser) {
					continue;
				}
				const subscribed = await isSubscribed(groupUser.id);
				if (subscribed === "free") {
					continue;
				}
				const newItems = await evaluateNotifications(
					group.userId,
					group.query,
					group.seenLinks,
					group.createdAt,
				);
				if (newItems.length > 0) {
					console.log(
						`sending notification for group ${group.name}, user ${groupUser.email}`,
					);
					if (group.notificationType === "email") {
						const emailBody = {
							from: `Sill <noreply@${process.env.EMAIL_DOMAIN}>`,
							to: groupUser.email,
							subject:
								newItems[0].link?.title ||
								`New Sill notification: ${group.name}`,
							"o:tag": "notification",
							...(await renderReactEmail(
								<Notification
									links={newItems}
									groupName={group.name}
									subscribed={subscribed}
									freeTrialEnd={groupUser.freeTrialEnd}
								/>,
							)),
						};
						await sendEmail(emailBody);
					} else if (group.notificationType === "rss") {
						for (const item of newItems) {
							const html = renderToString(
								<RSSNotificationItem linkPost={item} subscribed={subscribed} />,
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

			for (const userBookmark of bookmarks) {
				const posts = userBookmark.posts;
				const newPosts = await filterLinkOccurrences({
					userId: userBookmark.userId,
					url: userBookmark.linkUrl,
				});

				if (newPosts.length > 0) {
					for (const newPost of newPosts[0].posts.reverse()) {
						if (!posts.posts?.some((p) => p.id === newPost.id)) {
							posts.posts?.unshift(newPost);
						}
					}

					// Update uniqueActorsCount by counting unique actors
					const uniqueActors = new Set();

					for (const post of posts.posts || []) {
						const actorHandle = post.repostActorHandle || post.actorHandle;
						const actorName = post.repostActorHandle
							? post.repostActorName
							: post.actorName;

						const normalizedHandle =
							post.postType === "mastodon"
								? actorHandle.match(/^@?([^@]+)(?:@|$)/)?.[1]?.toLowerCase()
								: actorHandle
										.replace(".bsky.social", "")
										.replace("@", "")
										.toLowerCase();

						if (normalizedHandle) {
							const normalizedName = actorName
								?.toLowerCase()
								.replace(/\s*\(.*?\)\s*/g, "");
							uniqueActors.add(`${normalizedName}|${normalizedHandle}`);
						}
					}

					// Update the uniqueActorsCount in the posts object
					posts.uniqueActorsCount = uniqueActors.size;

					await db
						.update(bookmark)
						.set({
							posts: posts,
						})
						.where(eq(bookmark.id, userBookmark.id));
				}
			}

			const errorCount = results.filter((r) => r.status === "error").length;
			const batchDuration = Date.now() - batchStart;

			console.log(`[Queue] Batch complete:
      Processed: ${jobs.length}
      Success: ${results.filter((r) => r.status === "success").length}
      Errors: ${results.filter((r) => r.status === "error").length}
      Batch Duration: ${batchDuration}ms
    `);
			if (errorCount >= MAX_ERRORS_PER_BATCH) {
				console.error(
					`[Queue] Too many errors (${errorCount}), restarting process...`,
				);
				process.exit(1); // Exit with error code to trigger restart
			}
		} else {
			await db.refreshMaterializedView(networkTopTenView);

			// Find links with n+ posts in the last 24 hours that haven't been scraped
			const threshold = process.env.SCRAPE_SHARE_THRESHOLD
				? Number.parseInt(process.env.SCRAPE_SHARE_THRESHOLD)
				: 5;
			const linkPostCounts = await db
				.select({
					linkUrl: linkPostDenormalized.linkUrl,
					postCount: count(linkPostDenormalized.id).as("postCount"),
				})
				.from(linkPostDenormalized)
				.innerJoin(link, eq(linkPostDenormalized.linkUrl, link.url))
				.where(
					and(
						gte(
							linkPostDenormalized.postDate,
							sql`NOW() - INTERVAL '24 hours'`,
						),
						eq(link.scraped, false),
						not(ilike(link.url, "%.pdf")),
					),
				)
				.groupBy(linkPostDenormalized.linkUrl)
				.having(sql`COUNT(${linkPostDenormalized.id}) >= ${threshold}`);

			const highActivityUrls = [
				...new Set(linkPostCounts.map((lpc) => lpc.linkUrl)),
			];

			if (highActivityUrls.length > 0) {
				console.log(
					`[BROWSER RENDER] scraping ${highActivityUrls.length} urls`,
				);
				for (const url of highActivityUrls) {
					const result = await renderPageContent({
						url,
					});
					if (result.success) {
						const metadata = await extractHtmlMetadata(result.html);
						await db
							.update(link)
							.set({
								scraped: true,
								metadata,
							})
							.where(eq(link.url, url));
						console.log(`[BROWSER RENDER] success ${url}`);
					} else {
						console.log("[BROWSER RENDER] error", url, result.error);
					}
					await new Promise((resolve) => setTimeout(resolve, 1000));
				}
			}
			if (process.env.NODE_ENV === "production") {
				const users = await db.query.user.findMany({
					orderBy: asc(user.createdAt),
				});

				// slow down the queue processing if there are less than BATCH_SIZE users
				if (users.length < BATCH_SIZE) {
					await new Promise((resolve) => setTimeout(resolve, 60000));
				}

				// delete completed jobs
				await db
					.delete(accountUpdateQueue)
					.where(eq(accountUpdateQueue.status, "completed"));

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
