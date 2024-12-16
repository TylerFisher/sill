import type { Route } from "./+types/auth";
import {
	OAuthResolverError,
	OAuthResponseError,
} from "@atproto/oauth-client-node";
import { redirect } from "react-router";
import { createOAuthClient } from "~/server/oauth/client";
import { HandleResolver } from "@atproto/identity";

export const loader = async ({ request }: Route.LoaderArgs) => {
	const requestUrl = new URL(request.url);
	let handle = requestUrl.searchParams.get("handle");
	if (typeof handle !== "string") {
		throw new Error("Invalid handle");
	}

	handle = handle.trim();
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

	if (!handle.includes(".")) {
		handle = `${handle}.bsky.social`;
	}

	const resolver = new HandleResolver();

	const oauthClient = await createOAuthClient();
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
					return redirect("/connect?error=resolver");
				}
			}
			return redirect("/connect?error=resolver");
		}
		throw error;
	}
};
