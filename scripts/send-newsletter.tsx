import { countLinkOccurrences } from "~/utils/links.server";
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

sendNewsletter("0192c0d8-e5d6-7752-bb13-e8dc0df021b4");
