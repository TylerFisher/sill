import type { Route } from "./+types/update-accounts";
import { db } from "~/drizzle/db.server";
import {
	fetchLinks,
	insertNewLinks,
	evaluateNotifications,
	type ProcessedResult,
} from "~/utils/links.server";
import { asc, eq } from "drizzle-orm";
import {
	notificationGroup,
	notificationItem,
	user,
} from "~/drizzle/schema.server";
import { renderReactEmail, sendEmail } from "~/utils/email.server";
import Notification from "~/emails/Notification";
import { renderToString } from "react-dom/server";
import RSSNotificationItem from "~/components/rss/RSSNotificationItem";
import { uuidv7 } from "uuidv7-js";

export const loader = async ({ request }: Route.LoaderArgs) => {
	const authHeader = request.headers.get("Authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const token = authHeader.split(" ")[1];
	if (token !== process.env.CRON_API_KEY) {
		throw new Response("Forbidden", { status: 403 });
	}

	const notificationGroups = await db.query.notificationGroup.findMany();
	for (const group of notificationGroups) {
		const groupUser = await db.query.user.findFirst({
			where: eq(user.id, group.userId),
		});
		if (!groupUser) {
			continue;
		}

		const links = await fetchLinks(group.userId);
		await insertNewLinks(links);
		const notifications = await evaluateNotifications(
			group.userId,
			group.query,
			group.seenLinks,
		);

		if (notifications.length > 0) {
			if (group.notificationType === "email") {
				const emailBody = {
					from: "Sill <noreply@e.sill.social>",
					to: groupUser.email,
					subject: `New notifications for ${group.name}`,
					"o:tag": "notification",
					...(await renderReactEmail(
						<Notification
							links={notifications}
							groupName={group.name}
							name={groupUser.name}
							digestUrl={`https://sill.social/notifications/${group.id}`}
						/>,
					)),
				};
				await sendEmail(emailBody);
			} else if (group.notificationType === "rss") {
				for (const item of notifications) {
					const html = renderToString(<RSSNotificationItem linkPost={item} />);
					await db.insert(notificationItem).values({
						id: uuidv7(),
						notificationGroupId: group.id,
						itemHtml: html,
						itemData: item,
					});
				}
			}
			await db
				.update(notificationGroup)
				.set({
					seenLinks: notifications.map((n) => n.link?.url || ""),
				})
				.where(eq(notificationGroup.id, group.id));
		}
	}

	const now = new Date();
	const currentMinute = now.getMinutes();

	let users = await db.query.user.findMany({
		orderBy: asc(user.createdAt),
		with: {
			mastodonAccounts: {
				with: {
					mastodonInstance: true,
				},
			},
		},
	});
	// Determine which sixteenth of users to process based on current minute
	const sixteenthSize = Math.ceil(users.length / 16);
	// Calculate which 15-minute block we're in within a 4-hour period (0-15)
	const currentSixteenth = Math.floor(
		(currentMinute + (now.getHours() % 4) * 60) / 15,
	);
	const start = currentSixteenth * sixteenthSize;
	const end = Math.min(start + sixteenthSize, users.length);
	users = users.slice(start, end);

	const chunkSize = 10;
	for (let i = 0; i < users.length; i += chunkSize) {
		const userChunk = users.slice(i, i + chunkSize);
		const processedResults: ProcessedResult[] = [];

		await Promise.all(
			userChunk.map(async (user) => {
				try {
					const results = await fetchLinks(user.id);
					processedResults.push(...results);
				} catch (error) {
					console.error("error fetching links for", user.email, error);
					try {
						const results = await fetchLinks(user.id);
						processedResults.push(...results);
					} catch (error) {
						console.error(
							"error fetching links second time for",
							user.email,
							error,
						);
					}
				}
			}),
		);

		try {
			await insertNewLinks(processedResults);
		} catch (error) {
			console.error("error sending links to database", error);
			try {
				await insertNewLinks(processedResults);
			} catch (error) {
				console.error("error sending links to database second time", error);
			}
		}
	}

	return Response.json({});
};
