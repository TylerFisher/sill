import type { LoaderFunctionArgs } from "@remix-run/node";
import { getAuthorizationUrl } from "~/utils/mastodon.server";
import { createInstanceCookie } from "~/utils/session.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const instance = new URL(request.url).searchParams.get("instance");

	if (!instance) return null;
	const authorizationUrl = getAuthorizationUrl(instance);
	return await createInstanceCookie(request, instance, authorizationUrl);
};
