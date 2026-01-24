import { redirect } from "react-router";
import { apiMastodonAuthStart } from "~/utils/api-client.server";
import { createInstanceCookie } from "~/utils/session.server";
import type { Route } from "./+types/auth";

export const loader = async ({ request }: Route.LoaderArgs) => {
	const requestUrl = new URL(request.url);
	const referrer =
		request.headers.get("referer") || "/accounts/onboarding/social";
	const instance = requestUrl.searchParams.get("instance");
	const mode = requestUrl.searchParams.get("mode") as
		| "login"
		| "signup"
		| undefined;

	if (!instance) {
		return null;
	}

	try {
		const result = await apiMastodonAuthStart(request, { instance, mode });

		// Create instance cookie and redirect to authorization URL
		return await createInstanceCookie(
			request,
			result.instance,
			result.redirectUrl,
			mode || undefined,
		);
	} catch (error) {
		console.error("Mastodon auth error:", error);

		// Handle specific error codes
		if (error instanceof Error && error.message.includes("instance")) {
			const errorUrl = new URL(referrer);
			errorUrl.searchParams.set("error", "instance");
			return redirect(errorUrl.toString());
		}

		// Generic error fallback
		const errorUrl = new URL(referrer);
		errorUrl.searchParams.set("error", "oauth");
		return redirect(errorUrl.toString());
	}
};
