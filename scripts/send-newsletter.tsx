import { countLinkOccurrences } from "~/models/links.server";
import { sendEmail } from "~/utils/email.server";
import { prisma } from "~/db.server";
import TopLinks from "~/emails/topLinks";

const sendNewsletter = async (userId: string) => {
	const user = await prisma.user.findFirstOrThrow({
		where: {
			id: userId,
		},
		select: {
			email: true,
		},
	});

	const links = await countLinkOccurrences({
		userId,
	});

	const response = await sendEmail({
		to: user.email,
		subject: "Your top links",
		react: <TopLinks links={links} />,
	});
};

sendNewsletter("019272d2-6f1a-7ecb-99b5-f3a57fb6f7a8");
