import { type ActionFunctionArgs, redirect } from "@vercel/remix";
import { OAuthResponseError } from "@atproto/oauth-client-node";
import { createOAuthClient } from "~/server/oauth/client";
import { requireUserId } from "~/utils/auth.server";
import { HandleResolver } from "@atproto/identity";

const resolver = new HandleResolver();

export const action = async ({ request }: ActionFunctionArgs) => {
	const userId = await requireUserId(request);
	const data = await request.formData();
	const handle = data.get("handle");
	if (typeof handle !== "string") {
		throw new Error("Invalid handle");
	}
	const did = await resolver.resolve(handle);
	if (!did) {
		throw new Error("Failed to resolve handle");
	}
	const state = JSON.stringify({ userId, did });
	const oauthClient = await createOAuthClient();
	try {
		const url = await oauthClient.authorize(handle, {
			scope: "atproto transition:generic",
			state,
		});
		return redirect(url.toString());
	} catch (error) {
		if (error instanceof OAuthResponseError) {
			const url = await oauthClient.authorize(handle, {
				scope: "atproto transition:generic",
			});
			return redirect(url.toString());
		}
	}
};
