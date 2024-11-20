import {
	OAuthResponseError,
	type OAuthSession,
} from "@atproto/oauth-client-node";
import { type LoaderFunctionArgs, redirect } from "@remix-run/node";
import { createOAuthClient } from "~/server/oauth/client";
import { db } from "~/drizzle/db.server";
import { eq } from "drizzle-orm";
import { blueskyAccount } from "~/drizzle/schema.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
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
		if (error instanceof OAuthResponseError) {
			const client = await createOAuthClient();
			oauthSession = await client.restore(account.did);
		}
	}

	return Response.json({
		did: account.did,
		handle: account.handle,
		oauthSession,
	});
};
