import { HandleResolver } from "@atproto/identity";
import {
	OAuthResolverError,
	OAuthResponseError,
} from "@atproto/oauth-client-node";
import { redirect } from "react-router";
import { createOAuthClient } from "~/server/oauth/client";
import type { Route } from "./+types/auth";

export const loader = async ({ request }: Route.LoaderArgs) => {
	const requestUrl = new URL(request.url);
	const referrer =
		request.headers.get("referer") || "/accounts/onboarding/social";
	const oauthClient = await createOAuthClient();

	let handle = requestUrl.searchParams.get("handle");
	if (!handle) {
		const url = await oauthClient.authorize("https://bsky.social", {
			scope: "atproto transition:generic",
		});
		return redirect(url.toString());
	}

	handle = handle.trim();
	// Strip invisible Unicode control and format characters
	handle = handle.replace(/[\p{Cc}\p{Cf}]/gu, "");
	handle = handle.toLocaleLowerCase();

	if (handle.startsWith("@")) {
		handle = handle.slice(1);
	}

	if (handle.includes("@bsky.social")) {
		handle = handle.replace("@bsky.social", ".bsky.social");
	}

	if (handle.startsWith("https://bsky.app/profile/")) {
		handle = handle.slice("https://bsky.app/profile/".length);
	}

	if (!handle.includes(".") && !handle.startsWith("did:")) {
		handle = `${handle}.bsky.social`;
	}

	const resolver = new HandleResolver();

	try {
		const url = await oauthClient.authorize(handle, {
			scope: "atproto transition:generic",
		});
		return redirect(url.toString());
	} catch (error) {
		if (error instanceof OAuthResponseError) {
			const url = await oauthClient.authorize(handle, {
				scope: "atproto transition:generic",
			});
			return redirect(url.toString());
		}

		if (error instanceof OAuthResolverError) {
			const did = await resolver.resolve(handle);
			if (did) {
				try {
					const url = await oauthClient.authorize(did, {
						scope: "atproto transition:generic",
					});
					return redirect(url.toString());
				} catch {
					const errorUrl = new URL(referrer);
					errorUrl.searchParams.set("error", "resolver");
					return redirect(errorUrl.toString());
				}
			}
			const errorUrl = new URL(referrer);
			errorUrl.searchParams.set("error", "resolver");
			return redirect(errorUrl.toString());
		}
		throw error;
	}
};
