import { invariant } from "@epic-web/invariant";
import { redirect } from "@vercel/remix";
import { verifySessionStorage } from "~/utils/verification.server";
import { onboardingEmailSessionKey } from "./accounts.onboarding";
import type { VerifyFunctionArgs } from "./accounts.verify.server";

/**
 * Handles verification of email and redirects to onboarding page
 * @param param0 Parameters for verification including submission data
 * @returns Redirect response to onboarding page
 */
export async function handleVerification({ submission }: VerifyFunctionArgs) {
	invariant(
		submission.status === "success",
		"Submission should be successful by now",
	);
	const verifySession = await verifySessionStorage.getSession();
	verifySession.set(onboardingEmailSessionKey, submission.value.target);
	return redirect("/accounts/onboarding", {
		headers: {
			"set-cookie": await verifySessionStorage.commitSession(verifySession),
		},
	});
}
