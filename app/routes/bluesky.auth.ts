import { type LoaderFunctionArgs, redirect } from "@remix-run/node";
import { OAuthResponseError } from "@atproto/oauth-client-node";
import { createOAuthClient } from "~/server/oauth/client";
import { requireUserId } from "~/utils/auth.server";
import { HandleResolver } from "@atproto/identity";

const resolver = new HandleResolver();

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const userId = await requireUserId(request);
	const requestUrl = new URL(request.url);
	const handle = requestUrl.searchParams.get("handle");
	if (typeof handle !== "string") {
		throw new Error("Invalid handle");
	}
	const did = await resolver.resolve(handle);
	if (!did) {
		throw new Error("couldn't resolve handle");
	}
	const oauthClient = await createOAuthClient();
	try {
		const url = await oauthClient.authorize(did, {
			scope: "atproto transition:generic",
		});
		return redirect(url.toString());
	} catch (error) {
		if (error instanceof OAuthResponseError) {
			const url = await oauthClient.authorize(did, {
				scope: "atproto transition:generic",
			});
			return redirect(url.toString());
		}
		throw error;
	}
};
