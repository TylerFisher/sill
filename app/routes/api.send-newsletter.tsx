import type { LoaderFunctionArgs } from "@remix-run/node";
import { eq } from "drizzle-orm";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import TopLinks from "~/emails/topLinks";
import { sendEmail } from "~/utils/email.server";
import {
	filterLinkOccurrences,
	type MostRecentLinkPosts,
} from "~/utils/links.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const authHeader = request.headers.get("Authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const token = authHeader.split(" ")[1];
	if (token !== process.env.CRON_API_KEY) {
		throw new Response("Forbidden", { status: 403 });
	}
	const scheduledEmails = await db.query.emailSettings.findMany();
	const emails = await Promise.all(
		scheduledEmails.map(async (schedule) => {
			const currentHourUTC = new Date().getUTCHours();
			if (
				Number.parseInt(schedule.scheduledTime.split(":")[0]) === currentHourUTC
			) {
				return schedule;
			}
		}),
	);

	const emailResponses = [];
	const validEmails = emails.filter((email) => email !== undefined);

	for (let i = 0; i < validEmails.length; i++) {
		const email = validEmails[i];

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
			});
		} catch (error) {
			console.error("Failed to fetch links for :", error);
		}

		const response = await sendEmail({
			to: emailUser.email,
			subject: "Your top links for today",
			react: <TopLinks links={links} name={emailUser.name} />,
		});

		emailResponses.push(response);
	}

	return { emailResponses };
};
