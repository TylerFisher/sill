import { countLinkOccurrences } from "~/routes/links.server";
import { sendEmail } from "~/utils/email.server";
import { db } from "~/drizzle/db.server";
import TopLinks from "~/emails/topLinks";
import { eq } from "drizzle-orm";
import { user } from "~/drizzle/schema.server";

const sendNewsletter = async (userId: string) => {
	const existingUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
		columns: {
			email: true,
		},
	});

	if (!existingUser) {
		throw new Error("User not found");
	}

	const links = await countLinkOccurrences({
		userId,
	});

	const response = await sendEmail({
		to: existingUser.email,
		subject: "Your top links",
		react: <TopLinks links={links} />,
	});
};

sendNewsletter("019272d2-6f1a-7ecb-99b5-f3a57fb6f7a8");
