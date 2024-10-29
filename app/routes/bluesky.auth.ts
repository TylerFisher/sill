import { type ActionFunctionArgs, redirect } from "@vercel/remix";
import { OAuthResponseError } from "@atproto/oauth-client-node";
import { createOAuthClient } from "~/server/oauth/client";

export const action = async ({ request }: ActionFunctionArgs) => {
	const data = await request.formData();
	const handle = String(data.get("handle"));
	const oauthClient = await createOAuthClient();
	const state = JSON.stringify({ handle });
	try {
		const url = await oauthClient.authorize(handle, {
			scope: "atproto transition:generic",
			state,
		});
		return redirect(url.toString());
	} catch (error) {
		console.error(error);
		if (error instanceof OAuthResponseError) {
			const url = await oauthClient.authorize(handle, {
				scope: "atproto transition:generic",
				state,
			});
			return redirect(url.toString());
		}
	}
};
