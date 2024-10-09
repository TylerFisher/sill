import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { getAccessToken } from "~/utils/mastodon.server";
import { getInstanceCookie } from "~/session.server";
import { getUserId } from "~/utils/auth.server";
import { prisma } from "~/db.server";
import { uuidv7 } from "uuidv7-js";

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const url = new URL(request.url);
	const instance = await getInstanceCookie(request);
	const code = url.searchParams.get("code");
	const userId = await getUserId(request);

	if (!userId || !instance || !code) {
		throw new Error("Could not retrieve instance or code");
	}

	const tokenData = await getAccessToken(instance, code);

	await prisma.user.update({
		where: {
			id: userId,
		},
		data: {
			mastodonAccounts: {
				create: {
					id: uuidv7(),
					accessToken: tokenData.access_token,
					tokenType: tokenData.token_type,
					instance,
				},
			},
		},
	});

	return redirect("/connect");
};
