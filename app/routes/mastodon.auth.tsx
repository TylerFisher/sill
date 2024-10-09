import type { LoaderFunctionArgs } from "@remix-run/node";
import { getAuthorizationUrl } from "~/utils/mastodon.server";
import { createInstanceCookie } from "~/session.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const instance =
		new URL(request.url).searchParams.get("instance") ||
		"https://mastodon.social";
	const authorizationUrl = getAuthorizationUrl(instance);
	return await createInstanceCookie(request, instance, authorizationUrl);
};
