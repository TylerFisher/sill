import { invariant } from "@epic-web/invariant";
import { json, redirect } from "@remix-run/node";
import { db } from "~/drizzle/db.server";
import { verifySessionStorage } from "~/utils/verification.server";
import { resetPasswordUsernameSessionKey } from "./accounts.reset-password";
import type { VerifyFunctionArgs } from "./accounts.verify.server.ts";
import { eq, or } from "drizzle-orm";
import { user } from "~/drizzle/schema.server";

export async function handleVerification({ submission }: VerifyFunctionArgs) {
	invariant(
		submission.status === "success",
		"Submission should be successful by now",
	);
	const target = submission.value.target;
	const existingUser = await db.query.user.findFirst({
		where: or(eq(user.email, target), eq(user.username, target)),
		columns: { email: true, username: true },
	});
	// we don't want to say the user is not found if the email is not found
	// because that would allow an attacker to check if an email is registered
	if (!existingUser) {
		return json(
			{ result: submission.reply({ fieldErrors: { code: ["Invalid code"] } }) },
			{ status: 400 },
		);
	}

	const verifySession = await verifySessionStorage.getSession();
	verifySession.set(resetPasswordUsernameSessionKey, user.username);
	return redirect("/accounts/reset-password", {
		headers: {
			"set-cookie": await verifySessionStorage.commitSession(verifySession),
		},
	});
}
