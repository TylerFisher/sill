import { redirect } from "react-router";
import { apiMastodonCallback } from "~/utils/api.server";
import { getInstanceCookie } from "~/utils/session.server";
import type { Route } from "./+types/auth.callback";

export const loader = async ({ request }: Route.LoaderArgs) => {
	const url = new URL(request.url);
	const instance = await getInstanceCookie(request);
	const code = url.searchParams.get("code");

	if (!instance || !code) {
		return redirect("/settings?tabs=connect&error=instance");
	}

	try {
		const result = await apiMastodonCallback(request, code, instance);
		
		if (result.success) {
			return redirect("/download?service=Mastodon");
		}
		
		// Handle errors from API
		return redirect("/settings?tabs=connect&error=oauth");
	} catch (error) {
		console.error("Mastodon callback error:", error);
		
		// Handle specific error codes from API
		if (error instanceof Error) {
			if (error.message.includes('Not authenticated')) {
				return redirect("/accounts/login?redirectTo=/settings");
			}
			if (error.message.includes('instance')) {
				return redirect("/settings?tabs=connect&error=instance");
			}
		}
		
		// Fallback error
		return redirect("/settings?tabs=connect&error=oauth");
	}
};
