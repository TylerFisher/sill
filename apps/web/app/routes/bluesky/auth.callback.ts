import { redirect } from "react-router";
import { apiBlueskyAuthCallback } from "~/utils/api-client.server";
import {
	getBlueskyModeCookie,
	getBlueskyOriginCookie,
	clearBlueskyModeCookie,
} from "~/utils/session.server";
import type { Route } from "./+types/auth.callback";

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url);

	// Read auth mode and origin from session cookie (set during auth start)
	const authMode = await getBlueskyModeCookie(request);
	const origin = await getBlueskyOriginCookie(request);

	// Helper to build error redirect path based on mode and origin
	const getErrorRedirectPath = (errorCode: string) => {
		if (authMode === "login") return `/accounts/login?error=${errorCode}`;
		if (authMode === "signup") return `/accounts/signup?error=${errorCode}`;
		// For connect flow, redirect back to where the user came from
		if (origin) {
			const originUrl = new URL(origin, url.origin);
			originUrl.searchParams.set("error", errorCode);
			return originUrl.pathname + originUrl.search;
		}
		return `/settings?tabs=connect&error=${errorCode}`;
	};

	// Check for obvious errors first
	if (url.searchParams.get("error_description") === "Access denied") {
		return redirect(getErrorRedirectPath("denied"));
	}

	if (url.searchParams.get("error")) {
		return redirect(getErrorRedirectPath("oauth"));
	}

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

			// Otherwise it's a connect flow - redirect back to origin
			if (origin) {
				const originUrl = new URL(origin, url.origin);
				originUrl.searchParams.set("service", "Bluesky");
				return redirect(originUrl.pathname + originUrl.search, {
					headers: clearModeHeaders,
				});
			}
			return redirect("/settings?tabs=connect&service=Bluesky", {
				headers: clearModeHeaders,
			});
		}

		// Handle other errors
		return redirect(getErrorRedirectPath("oauth"));
	} catch (error) {
		console.error("Bluesky callback error:", error);

		// Handle specific error codes from API
		if (error instanceof Error) {
			if (error.message.includes("denied")) {
				return redirect(getErrorRedirectPath("denied"));
			}
			if (error.message.includes("login_required")) {
				return redirect(getErrorRedirectPath("oauth"));
			}
			if (error.message.includes("account_exists")) {
				return redirect(getErrorRedirectPath("account_exists"));
			}
		}

		// Fallback
		return redirect(getErrorRedirectPath("oauth"));
	}
}
