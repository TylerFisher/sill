import { invariant } from "@epic-web/invariant";
import { data, redirect } from "@remix-run/node";
import { eq } from "drizzle-orm";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import EmailChangeNotice from "~/emails/emailChangeNotice";
import { newEmailAddressSessionKey } from "~/routes/accounts.change-email";
import { sendEmail } from "~/utils/email.server";
import { verifySessionStorage } from "~/utils/verification.server";
import {
	type VerifyFunctionArgs,
	requireRecentVerification,
} from "~/utils/verify.server";

/**
 * Handles verification of email change and sends email change notice
 * @param param0 Parameters for function including request and submission data
 * @returns Redirect response to settings page
 */
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
		return data(
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
	const preUpdateUser = await db.query.user.findFirst({
		columns: { email: true },
		where: eq(user.email, submission.value.target),
	});

	if (!preUpdateUser) {
		throw new Error("Something went wrong");
	}

	const updatedUser = await db
		.update(user)
		.set({
			email: newEmail,
		})
		.where(eq(user.email, submission.value.target))
		.returning({
			id: user.id,
			email: user.email,
		});

	await sendEmail({
		to: preUpdateUser.email,
		subject: "Sill email changed",
		react: <EmailChangeNotice userId={updatedUser[0].id} />,
	});

	return redirect("/settings", {
		headers: {
			"set-cookie": await verifySessionStorage.destroySession(verifySession),
		},
	});
}
