import { type LoaderFunctionArgs, redirect } from "@vercel/remix";
import { createOAuthClient } from "~/server/oauth/client";
import { Agent } from "@atproto/api";
import { db } from "~/drizzle/db.server";
import { uuidv7 } from "uuidv7-js";
import { requireUserId } from "~/utils/auth.server";
import { blueskyFetchQueue } from "~/utils/queue.server";
import { blueskyAccount } from "~/drizzle/schema.server";
import {
	OAuthCallbackError,
	OAuthResponseError,
	type OAuthSession,
} from "@atproto/oauth-client-node";

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request);
	try {
		const oauthClient = await createOAuthClient();
		let oauthSession: OAuthSession | null = null;
		try {
			const session = await oauthClient.callback(
				new URL(request.url).searchParams,
			);
			oauthSession = session.session;
		} catch (error) {
			if (error instanceof OAuthResponseError) {
				const session = await oauthClient.callback(
					new URL(request.url).searchParams,
				);
				oauthSession = session.session;
			} else if (
				error instanceof OAuthCallbackError &&
				["login_required", "consent_required"].includes(
					error.params.get("error") || "",
				)
			) {
				const client = await createOAuthClient();
				const { userId, handle } = JSON.parse(error.state || "");
				const url = await client.authorize(handle, {
					state: JSON.stringify({
						userId,
						handle,
					}),
				});

				return redirect(url.toString());
			} else {
				throw error;
			}
		}

		if (!oauthSession) {
			throw new Error("OAuth session couldn't be created");
		}

		const agent = new Agent(oauthSession);
		const profile = await agent.getProfile({
			actor: oauthSession.did,
		});
		await db.insert(blueskyAccount).values({
			id: uuidv7(),
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
