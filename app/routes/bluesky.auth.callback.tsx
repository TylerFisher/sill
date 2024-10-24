import { type LoaderFunctionArgs, redirect } from "@vercel/remix";

import { createOAuthClient } from "~/server/oauth/client";
import { Agent } from "@atproto/api";
import { db } from "~/drizzle/db.server";
import { uuidv7 } from "uuidv7-js";
import { requireUserId } from "~/utils/auth.server";
import { blueskyFetchQueue } from "~/utils/queue.server";
import { blueskyAccount } from "~/drizzle/schema.server";

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request);
	try {
		const oauthClient = await createOAuthClient();
		const { session: oauthSession } = await oauthClient.callback(
			new URL(request.url).searchParams,
		);
		const token = await oauthSession.getTokenSet();
		const agent = new Agent(oauthSession);
		const profile = await agent.getProfile({
			actor: oauthSession.did,
		});
		await db.insert(blueskyAccount).values({
			id: uuidv7(),
			accessJwt: token.access_token,
			refreshJwt: token.refresh_token,
			did: oauthSession.did,
			handle: profile.data.handle,
			userId: userId,
			service: oauthSession.serverMetadata.issuer,
		});

		blueskyFetchQueue.add(`${userId}-bluesky-fetch`, {
			userId,
		});

		return redirect("/connect");
	} catch (error) {
		console.error("Bluesky OAuth Error", { error: String(error) });
		return redirect("/connect");
	}
}
