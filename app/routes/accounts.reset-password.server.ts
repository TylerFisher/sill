import { invariant } from "@epic-web/invariant";
import { json, redirect } from "@remix-run/node";
import { prisma } from "~/db.server";
import { verifySessionStorage } from "~/utils/verification.server";
import { resetPasswordUsernameSessionKey } from "./accounts.reset-password";
import type { VerifyFunctionArgs } from "./accounts.verify.server.ts";

export async function handleVerification({ submission }: VerifyFunctionArgs) {
	invariant(
		submission.status === "success",
		"Submission should be successful by now",
	);
	const target = submission.value.target;
	const user = await prisma.user.findFirst({
		where: { OR: [{ email: target }, { username: target }] },
		select: { email: true, username: true },
	});
	// we don't want to say the user is not found if the email is not found
	// because that would allow an attacker to check if an email is registered
	if (!user) {
		return json(
			{ result: submission.reply({ fieldErrors: { code: ["Invalid code"] } }) },
			{ status: 400 },
		);
	}

	const verifySession = await verifySessionStorage.getSession();
	verifySession.set(resetPasswordUsernameSessionKey, user.username);
	return redirect("/reset-password", {
		headers: {
			"set-cookie": await verifySessionStorage.commitSession(verifySession),
		},
	});
}
