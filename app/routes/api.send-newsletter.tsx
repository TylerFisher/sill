import type { LoaderFunctionArgs } from "@remix-run/node";
import { eq } from "drizzle-orm";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import TopLinks from "~/emails/topLinks";
import { sendEmail } from "~/utils/email.server";
import { filterLinkOccurrences } from "~/utils/links.server";

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
		// Wait for 1 second between each email
		await new Promise((resolve) => setTimeout(resolve, 1000));

		const emailUser = await db.query.user.findFirst({
			where: eq(user.id, email.userId),
		});

		if (!emailUser) {
			throw new Error("Couldn't find user for email");
		}

		const links = await filterLinkOccurrences({
			userId: emailUser.id,
		});

		const response = await sendEmail({
			to: emailUser.email,
			subject: "Your top links for today",
			react: <TopLinks links={links} name={emailUser.name} />,
		});

		emailResponses.push(response);
	}

	return { emailResponses };
};
