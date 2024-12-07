import type { LoaderFunctionArgs } from "@remix-run/node";
import { eq } from "drizzle-orm";
import { db } from "~/drizzle/db.server";
import {
	digestRssFeed,
	digestRssFeedItem,
	user,
} from "~/drizzle/schema.server";
import TopLinks from "~/emails/topLinks";
import { renderReactEmail } from "~/utils/email.server";
import {
	filterLinkOccurrences,
	type MostRecentLinkPosts,
} from "~/utils/links.server";
import { Resend } from "resend";
import { renderToString } from "react-dom/server";
import { uuidv7 } from "uuidv7-js";

const resend = new Resend(process.env.RESEND_API_KEY);

interface Email {
	from: string;
	to: string;
	subject: string;
	html: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const authHeader = request.headers.get("Authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const token = authHeader.split(" ")[1];
	if (token !== process.env.CRON_API_KEY) {
		throw new Response("Forbidden", { status: 403 });
	}
	const scheduledDigests = await db.query.digestSettings.findMany();
	const digests = await Promise.all(
		scheduledDigests.map(async (digest) => {
			const currentHourUTC = new Date().getUTCHours();
			if (
				Number.parseInt(digest.scheduledTime.split(":")[0]) === currentHourUTC
			) {
				return digest;
			}
		}),
	);

	const emailsToSend = digests
		.filter((digest) => digest !== undefined)
		.filter((digest) => digest.digestType === "email");

	const emailBodies: Email[] = [];
	for (const email of emailsToSend) {
		const emailUser = await db.query.user.findFirst({
			where: eq(user.id, email.userId),
		});

		if (!emailUser) {
			throw new Error("Couldn't find user for email");
		}

		let links: MostRecentLinkPosts[] = [];
		try {
			links = await filterLinkOccurrences({
				userId: emailUser.id,
				fetch: true,
				hideReposts: email.hideReposts,
				limit: email.topAmount,
			});
		} catch (error) {
			console.error("Failed to fetch links for :", error);
			// get what we have
			try {
				links = await filterLinkOccurrences({
					userId: emailUser.id,
					hideReposts: email.hideReposts,
					limit: email.topAmount,
				});
			} catch (error) {
				console.error("Second fetch failed to fetch links for :", error);
			}
		}

		const emailBody = {
			from: "Sill <noreply@mail.sill.social>",
			to: emailUser.email,
			subject: "Your top links for today",
			...(await renderReactEmail(
				<TopLinks links={links} name={emailUser.name} />,
			)),
		};
		emailBodies.push(emailBody);
	}

	try {
		await resend.batch.send(emailBodies);
	} catch (error) {
		console.error("Failed to send emails", error);
		// Wait a second and try again
		setTimeout(async () => {
			await resend.batch.send(emailBodies);
		}, 1000);
	}

	const rssToBuild = digests
		.filter((digest) => digest !== undefined)
		.filter((digest) => digest.digestType === "rss");

	for (const rss of rssToBuild) {
		const rssUser = await db.query.user.findFirst({
			where: eq(user.id, rss.userId),
		});

		const rssFeed = await db.query.digestRssFeed.findFirst({
			where: eq(digestRssFeed.userId, rss.userId),
		});

		if (!rssUser || !rssFeed) {
			throw new Error("Couldn't find rss feed for user");
		}

		let links: MostRecentLinkPosts[] = [];
		try {
			links = await filterLinkOccurrences({
				userId: rssUser.id,
				fetch: true,
				hideReposts: rss.hideReposts,
				limit: rss.topAmount,
			});
		} catch (error) {
			console.error("Failed to fetch links for :", error);
			// get what we have
			try {
				links = await filterLinkOccurrences({
					userId: rssUser.id,
					hideReposts: rss.hideReposts,
					limit: rss.topAmount,
				});
			} catch (error) {
				console.error("Second fetch failed to fetch links for :", error);
			}
		}

		const html = renderToString(<TopLinks links={links} name={rssUser.name} />);
		await db.insert(digestRssFeedItem).values({
			id: uuidv7(),
			feedId: rssFeed.id,
			title: "Your top links for today",
			html,
			description: "Your top links for today",
			pubDate: new Date(),
		});
	}

	return Response.json({});
};
