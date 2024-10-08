import { type ActionFunctionArgs, json, redirect } from "@remix-run/node";
import { prisma } from "~/db.server"; // Adjust based on your project structure
import { requireUserId } from "~/utils/auth.server"; // Adjust based on your session setup

export const action = async ({ request }: ActionFunctionArgs) => {
	const userId = await requireUserId(request);

	if (!userId) {
		throw new Error("User not authenticated.");
	}

	// Fetch the user's tokens
	const user = await prisma.user.findUnique({
		where: { id: userId },
		include: {
			mastodonAccounts: true,
		},
	});

	if (user && user.mastodonAccounts.length > 0) {
		const token = user.mastodonAccounts[0];

		const accessToken = token.accessToken;
		const instance = token.instance;

		// Revoke the token
		await fetch(`${instance}/oauth/revoke`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
			body: JSON.stringify({
				client_id: process.env.MASTODON_CLIENT_ID,
				client_secret: process.env.MASTODON_CLIENT_SECRET,
			}),
		});

		// Delete tokens from the database
		await prisma.mastodonAccount.deleteMany({
			where: { userId: userId },
		});

		return redirect("/settings/connect");
	}

	return json({ message: "No tokens to revoke." });
};
