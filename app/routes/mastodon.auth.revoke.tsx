import { type ActionFunctionArgs, json, redirect } from "@remix-run/node";
import { eq } from "drizzle-orm";
import { db } from "~/drizzle/db.server";
import { mastodonAccount, user } from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";

export const action = async ({ request }: ActionFunctionArgs) => {
	const userId = await requireUserId(request);

	if (!userId) {
		throw new Error("User not authenticated.");
	}

	const existingUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
		with: {
			mastodonAccounts: {
				with: {
					mastodonInstance: true,
				},
			},
		},
	});

	if (existingUser && existingUser.mastodonAccounts.length > 0) {
		const token = existingUser.mastodonAccounts[0];

		const accessToken = token.accessToken;
		const instance = token.mastodonInstance.instance;

		// Revoke the token
		await fetch(`https://${instance}/oauth/revoke`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
			body: JSON.stringify({
				client_id: token.mastodonInstance.clientId,
				client_secret: token.mastodonInstance.clientSecret,
			}),
		});

		// Delete tokens from the database
		await db.delete(mastodonAccount).where(eq(mastodonAccount.userId, userId));

		return redirect("/connect");
	}

	return json({ message: "No tokens to revoke." });
};
