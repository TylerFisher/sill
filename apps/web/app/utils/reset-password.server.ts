import { invariant } from "@epic-web/invariant";
import { data, redirect } from "react-router";
import { resetPasswordEmailSessionKey } from "~/routes/accounts/reset-password";
import { verifySessionStorage } from "~/utils/verification.server";
import type { VerifyFunctionArgs } from "~/utils/verify.server.ts";
import { apiSearchUser } from "./api-client.server";

/**
 * Verifies verification code and redirects to reset password page
 * @param param0 Parameters for verification including submission data
 * @returns Redirect response to reset password page
 */
export async function handleVerification({
  request,
  submission,
}: VerifyFunctionArgs) {
  invariant(
    submission.status === "success",
    "Submission should be successful by now"
  );
  const target = submission.value.target;
  const existingUser = await apiSearchUser(request, target);
  // we don't want to say the user is not found if the email is not found
  // because that would allow an attacker to check if an email is registered
  if (!existingUser) {
    return data(
      { result: submission.reply({ fieldErrors: { code: ["Invalid code"] } }) },
      { status: 400 }
    );
  }

  const verifySession = await verifySessionStorage.getSession();
  verifySession.set(resetPasswordEmailSessionKey, existingUser.user.email);
  return redirect("/accounts/reset-password", {
    headers: {
      "set-cookie": await verifySessionStorage.commitSession(verifySession),
    },
  });
}
