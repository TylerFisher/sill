import { invariant } from "@epic-web/invariant";
import { eq } from "drizzle-orm";
import { data, redirect } from "react-router";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import EmailChangeNotice from "~/emails/emailChangeNotice";
import { newEmailAddressSessionKey } from "~/routes/accounts/change-email";
import { sendEmail } from "~/utils/email.server";
import { verifySessionStorage } from "~/utils/verification.server";
import {
	type VerifyFunctionArgs,
} from "~/utils/verify.server";
import { apiSearchUser, apiUpdateEmail } from "./api-client.server";

/**
 * Handles verification of email change and sends email change notice
 * @param param0 Parameters for function including request and submission data
 * @returns Redirect response to settings page
 */
export async function handleVerification({
	request,
	submission,
}: VerifyFunctionArgs) {
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
	const preUpdateUser = await apiSearchUser(request, submission.value.target);

	if (!preUpdateUser) {
		throw new Error("Something went wrong");
	}

  await apiUpdateEmail(request, { oldEmail: submission.value.target, newEmail });

	return redirect("/settings", {
		headers: {
			"set-cookie": await verifySessionStorage.destroySession(verifySession),
		},
	});
}
