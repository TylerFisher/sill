import { invariant } from "@epic-web/invariant";
import { json, redirect } from "@remix-run/node";
import {
	requireRecentVerification,
	type VerifyFunctionArgs,
} from "~/routes/accounts.verify.server";
import { prisma } from "~/db.server";
import { sendEmail } from "~/utils/email.server";
import { verifySessionStorage } from "~/utils/verification.server";
import EmailChangeNotice from "~/emails/emailChangeNotice";
import { newEmailAddressSessionKey } from "./settings.change-email";

export async function handleVerification({
	request,
	submission,
}: VerifyFunctionArgs) {
	await requireRecentVerification(request);
	invariant(
		submission.status === "success",
		"Submission should be successful by now",
	);

	const verifySession = await verifySessionStorage.getSession(
		request.headers.get("cookie"),
	);
	const newEmail = verifySession.get(newEmailAddressSessionKey);
	if (!newEmail) {
		return json(
			{
				result: submission.reply({
					formErrors: [
						"You must submit the code on the same device that requested the email change.",
					],
				}),
			},
			{ status: 400 },
		);
	}
	const preUpdateUser = await prisma.user.findFirstOrThrow({
		select: { email: true },
		where: { id: submission.value.target },
	});
	const user = await prisma.user.update({
		where: { id: submission.value.target },
		select: { id: true, email: true, username: true },
		data: { email: newEmail },
	});

	await sendEmail({
		to: preUpdateUser.email,
		subject: "Epic Stack email changed",
		react: <EmailChangeNotice userId={user.id} />,
	});

	return redirect("/settings/profile", {
		headers: {
			"set-cookie": await verifySessionStorage.destroySession(verifySession),
		},
	});
}
