import { type LoaderFunctionArgs, redirect } from "@remix-run/node";

import { createOAuthClient } from "~/server/oauth/client";
import { Agent } from "@atproto/api";
import { prisma } from "~/db.server";
import { uuidv7 } from "uuidv7-js";
import { requireUserId } from "~/utils/auth.server";
import { blueskyFetchQueue } from "~/queue.server";

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
		await prisma.blueskyAccount.upsert({
			where: {
				did: oauthSession.did,
			},
			create: {
				id: uuidv7(),
				accessJwt: token.access_token,
				refreshJwt: token.refresh_token,
				did: oauthSession.did,
				handle: profile.data.handle,
				userId,
				service: oauthSession.serverMetadata.issuer,
			},
			update: {
				accessJwt: token.access_token,
				refreshJwt: token.refresh_token,
				did: oauthSession.did,
				handle: profile.data.handle,
				userId,
				service: oauthSession.serverMetadata.issuer,
			},
		});

		blueskyFetchQueue.add(`${userId}-bluesky-fetch`, {
			userId,
		});

		return redirect("/settings/connect");
	} catch (error) {
		console.error("Bluesky OAuth Error", { error: String(error) });
		return redirect("/settings/connect");
	}
}
