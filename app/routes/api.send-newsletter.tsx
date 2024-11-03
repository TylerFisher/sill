import { eq } from "drizzle-orm";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import TopLinks from "~/emails/topLinks";
import { sendEmail } from "~/utils/email.server";
import { filterLinkOccurrences } from "~/utils/links.server";

export const loader = async () => {
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

	const emailResponses = await Promise.all(
		emails
			.filter((email) => email !== undefined)
			.map(async (email) => {
				const emailUser = await db.query.user.findFirst({
					where: eq(user.id, email.userId),
				});

				if (!emailUser) {
					throw new Error("Couldn't find user for email");
				}

				const links = await filterLinkOccurrences({
					userId: emailUser.id,
				});

				return sendEmail({
					to: emailUser.email,
					subject: "Your top links for today",
					react: <TopLinks links={links} name={emailUser.name} />,
				});
			}),
	);

	return { emailResponses };
};
