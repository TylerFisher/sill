import {
	OAuthResolverError,
	OAuthResponseError,
} from "@atproto/oauth-client-node";
import { type LoaderFunctionArgs, redirect } from "@remix-run/node";
import { createOAuthClient } from "~/server/oauth/client";

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const requestUrl = new URL(request.url);
	let handle = requestUrl.searchParams.get("handle");
	if (typeof handle !== "string") {
		throw new Error("Invalid handle");
	}

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

	if (handle.includes("+")) {
		handle = handle.replace("+", "");
	}

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
			return redirect("/connect?error=resolver");
		}
		throw error;
	}
};
