import type { Route } from "./+types/auth.callback";
import { redirect } from "react-router";

import { Agent } from "@atproto/api";
import { uuidv7 } from "uuidv7-js";
import { db } from "~/drizzle/db.server";
import { blueskyAccount } from "~/drizzle/schema.server";
import { createOAuthClient } from "~/server/oauth/client";
import { requireUserId } from "~/utils/auth.server";
import { OAuthCallbackError } from "@atproto/oauth-client-node";

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request);
	const oauthClient = await createOAuthClient();

	const url = new URL(request.url);
	if (url.searchParams.get("error_description") === "Access denied") {
		return redirect("/accounts/onboarding/social?error=denied");
	}

	if (url.searchParams.get("error")) {
		return redirect("/accounts/onboarding/social?error=oauth");
	}

	try {
		const { session: oauthSession } = await oauthClient.callback(
			new URL(request.url).searchParams,
		);
		const agent = new Agent(oauthSession);
		const profile = await agent.getProfile({
			actor: oauthSession.did,
		});
		await db
			.insert(blueskyAccount)
			.values({
				id: uuidv7(),
				did: oauthSession.did,
				handle: profile.data.handle,
				userId: userId,
				service: oauthSession.serverMetadata.issuer,
			})
			.onConflictDoUpdate({
				target: blueskyAccount.did,
				set: {
					handle: profile.data.handle,
					service: oauthSession.serverMetadata.issuer,
				},
			});

		return redirect("/download?service=Bluesky");
	} catch (error) {
		if (
			error instanceof OAuthCallbackError &&
			["login_required", "consent_required"].includes(
				error.params.get("error") || "",
			)
		) {
			if (error.state) {
				const { user, handle } = JSON.parse(error.state);
				const url = await oauthClient.authorize(handle, {
					state: JSON.stringify({
						user,
						handle,
					}),
				});

				return redirect(url.toString());
			}
		}

		const { session: oauthSession } = await oauthClient.callback(
			new URL(request.url).searchParams,
		);
		const agent = new Agent(oauthSession);
		const profile = await agent.getProfile({
			actor: oauthSession.did,
		});
		await db
			.insert(blueskyAccount)
			.values({
				id: uuidv7(),
				did: oauthSession.did,
				handle: profile.data.handle,
				userId: userId,
				service: oauthSession.serverMetadata.issuer,
			})
			.onConflictDoUpdate({
				target: blueskyAccount.did,
				set: {
					handle: profile.data.handle,
					service: oauthSession.serverMetadata.issuer,
				},
			});

		console.error("Bluesky OAuth Error", { error: String(error) });
		return redirect("/download?service=Bluesky");
	}
}
