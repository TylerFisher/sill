import type { Route } from "./+types/auth.restore";
import {
	OAuthResponseError,
	type OAuthSession,
} from "@atproto/oauth-client-node";
import { redirect } from "react-router";
import { createOAuthClient } from "~/server/oauth/client";
import { db } from "~/drizzle/db.server";
import { eq } from "drizzle-orm";
import { blueskyAccount } from "~/drizzle/schema.server";

export const loader = async ({ request }: Route.LoaderArgs) => {
	const url = new URL(request.url);
	const handle = url.searchParams.get("handle");

	if (typeof handle !== "string") {
		throw new Error("Invalid handle");
	}

	const account = await db.query.blueskyAccount.findFirst({
		where: eq(blueskyAccount.handle, handle),
	});

	if (!account) {
		return redirect("/connect");
	}

	let oauthSession: OAuthSession | null = null;
	try {
		const client = await createOAuthClient();
		oauthSession = await client.restore(account.did);
	} catch (error) {
		const client = await createOAuthClient();

		if (error instanceof OAuthResponseError) {
			oauthSession = await client.restore(account.did);
		}

		const callback = await client.authorize(handle, {
			// Use "prompt=none" to attempt silent sign-in
			prompt: "none",

			// Build an internal state to map the login request to the user, and allow retries
			state: JSON.stringify({
				user: account.userId,
				handle,
			}),
		});
		console.error(error);

		return redirect(callback.toString());
	}

	return Response.json({
		did: account.did,
		handle: account.handle,
		oauthSession,
	});
};
