import { invariant } from "@epic-web/invariant";
import { data, redirect } from "react-router";
import {
	newEmailAddressSessionKey,
	addEmailRedirectToSessionKey,
} from "~/routes/accounts/add-email";
import { verifySessionStorage } from "~/utils/verification.server";
import type { VerifyFunctionArgs } from "~/utils/verify.server";
import { apiSetEmail } from "./api-client.server";

/**
 * Handles verification of email addition for OAuth users without email
 * @param param0 Parameters for function including request and submission data
 * @returns Redirect response to the original page or settings page
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
						"You must submit the code on the same device that requested to add the email.",
					],
				}),
			},
			{ status: 400 },
		);
	}

	await apiSetEmail(request, { email: newEmail });

	// Get the redirect URL from session, default to settings page
	const redirectTo =
		verifySession.get(addEmailRedirectToSessionKey) || "/settings/account";

	return redirect(redirectTo, {
		headers: {
			"set-cookie": await verifySessionStorage.destroySession(verifySession),
		},
	});
}
