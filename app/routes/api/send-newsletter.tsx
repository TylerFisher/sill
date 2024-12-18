import type { Route } from "./+types/send-newsletter";
import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { db } from "~/drizzle/db.server";
import { digestRssFeed, digestItem, user } from "~/drizzle/schema.server";
import TopLinks from "~/emails/topLinks";
import RSSLinks from "~/components/rss/RSSLinks";
import { renderReactEmail } from "~/utils/email.server";
import {
	filterLinkOccurrences,
	type MostRecentLinkPosts,
} from "~/utils/links.server";
import { renderToString } from "react-dom/server";
import { uuidv7 } from "uuidv7-js";
import { preview, subject } from "~/utils/digestText";
const resend = new Resend(process.env.RESEND_API_KEY);
interface Email {
	from: string;
	to: string;
	subject: string;
	html: string;
}

export const loader = async ({ request }: Route.LoaderArgs) => {
	const authHeader = request.headers.get("Authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const token = authHeader.split(" ")[1];
	if (token !== process.env.CRON_API_KEY) {
		throw new Response("Forbidden", { status: 403 });
	}

	const requestUrl = new URL(request.url);
	const baseUrl = `${requestUrl.origin}/digest`;

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

	const emailBodies: Email[] = [];
	for (const digest of digests) {
		if (!digest) {
			continue;
		}
		const dbUser = await db.query.user.findFirst({
			where: eq(user.id, digest.userId),
		});

		if (!dbUser) {
			throw new Error("Couldn't find user for email");
		}

		let links: MostRecentLinkPosts[] = [];
		try {
			links = await filterLinkOccurrences({
				userId: dbUser.id,
				fetch: true,
				hideReposts: digest.hideReposts,
				limit: digest.topAmount,
			});
		} catch (error) {
			console.error("Failed to fetch links for :", error);
			// get what we have
			try {
				links = await filterLinkOccurrences({
					userId: dbUser.id,
					hideReposts: digest.hideReposts,
					limit: digest.topAmount,
				});
			} catch (error) {
				console.error("Second fetch failed to fetch links for :", error);
			}
		}

		const digestId = uuidv7();
		const digestUrl = `${baseUrl}/${dbUser.id}/${digestId}`;

		const digestItemValues: typeof digestItem.$inferInsert = {
			id: digestId,
			title: subject,
			json: links,
			description: preview(links),
			pubDate: new Date(),
			userId: dbUser.id,
		};

		if (digest.digestType === "email") {
			const emailBody = {
				from: "Sill <noreply@mail.sill.social>",
				to: dbUser.email,
				subject: subject,
				"o:tag": "digest",
				...(await renderReactEmail(
					<TopLinks
						links={links}
						name={dbUser.name}
						digestUrl={digestUrl}
						layout={digest.layout}
					/>,
				)),
			};
			emailBodies.push(emailBody);

			// try {
			// 	const emailResp = await sendEmail(emailBody);
			// 	console.log("email sent", emailResp);
			// } catch (e) {
			// 	console.error("Failed to send email", e);
			// }
		} else {
			const rssFeed = await db.query.digestRssFeed.findFirst({
				where: eq(digestRssFeed.userId, digest.userId),
			});
			digestItemValues.feedId = rssFeed?.id;
			digestItemValues.html = renderToString(
				<RSSLinks links={links} name={dbUser.name} digestUrl={digestUrl} />,
			);
		}

		if (links.length === 0) {
			continue;
		}

		try {
			await db.insert(digestItem).values(digestItemValues);
		} catch (error) {
			console.error("Failed to insert digest item for", dbUser.email, error);
		}
	}

	try {
		const resp = await resend.batch.send(emailBodies);
		console.log("emails sent", resp);
	} catch (error) {
		console.error("Failed to send emails", error);
		// Wait a second and try again
		setTimeout(async () => {
			await resend.batch.send(emailBodies);
		}, 1000);
	}

	return Response.json({});
};
