import { redirect } from "react-router";
import { apiBlueskyAuthCallback } from "~/utils/api-client.server";
import {
	getBlueskyModeCookie,
	clearBlueskyModeCookie,
} from "~/utils/session.server";
import type { Route } from "./+types/auth.callback";

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url);

	// Check for obvious errors first
	if (url.searchParams.get("error_description") === "Access denied") {
		return redirect("/accounts/onboarding/social?error=denied");
	}

	if (url.searchParams.get("error")) {
		return redirect("/accounts/onboarding/social?error=oauth");
	}

	// Read auth mode from session cookie (set during auth start)
	const authMode = await getBlueskyModeCookie(request);

	const callbackData = {
		searchParams: url.searchParams.toString(),
		mode: authMode,
	};

	try {
		const result = await apiBlueskyAuthCallback(request, callbackData);
		const data = await result.json();

		if ("error" in data) {
			// Handle login_required case
			if (data.error === "login_required") {
				//@ts-expect-error: idk about this yet
				return redirect(data.redirectUrl);
			}
			throw new Error(data.error);
		}

		if (data.success) {
			// Clear the bluesky mode cookie and forward the Set-Cookie header from API
			const clearModeHeaders = await clearBlueskyModeCookie(request);
			const apiSetCookie = result.headers.get("set-cookie");
			if (apiSetCookie) {
				clearModeHeaders.append("set-cookie", apiSetCookie);
			}

			// Check if this was a login flow
			if ("isLogin" in data && data.isLogin) {
				// Redirect to main page for login with session cookie
				return redirect("/links", { headers: clearModeHeaders });
			}

			// Check if this was a signup flow
			if ("isSignup" in data && data.isSignup) {
				// Redirect to download page for new signups (Bluesky is already connected)
				return redirect("/download?service=Bluesky", { headers: clearModeHeaders });
			}

			// Otherwise it's a connect flow
			return redirect("/download?service=Bluesky", { headers: clearModeHeaders });
		}

		// Handle other errors
		return redirect("/accounts/onboarding/social?error=oauth");
	} catch (error) {
		console.error("Bluesky callback error:", error);

		// Handle specific error codes from API
		if (error instanceof Error) {
			if (error.message.includes("denied")) {
				return redirect("/accounts/login?error=bluesky");
			}
			if (error.message.includes("login_required")) {
				return redirect("/accounts/login?error=bluesky");
			}
		}

		// Fallback - redirect to login with error
		return redirect("/accounts/login?error=bluesky");
	}
}
