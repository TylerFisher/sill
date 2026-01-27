import { redirect } from "react-router";
import { apiMastodonAuthCallback } from "~/utils/api-client.server";
import {
	getInstanceCookie,
	getMastodonModeCookie,
	getMastodonOriginCookie,
} from "~/utils/session.server";
import type { Route } from "./+types/auth.callback";

export const loader = async ({ request }: Route.LoaderArgs) => {
	const url = new URL(request.url);
	const instance = await getInstanceCookie(request);
	const mode = await getMastodonModeCookie(request);
	const origin = await getMastodonOriginCookie(request);
	const code = url.searchParams.get("code");

	// Determine where to redirect on error based on mode and origin
	const getErrorRedirectPath = (errorCode: string) => {
		if (mode === "login") return `/accounts/login?error=${errorCode}`;
		if (mode === "signup") return `/accounts/signup?error=${errorCode}`;
		// For connect flow, redirect back to where the user came from
		if (origin) {
			const originUrl = new URL(origin, url.origin);
			originUrl.searchParams.set("error", errorCode);
			return originUrl.pathname + originUrl.search;
		}
		return `/settings?tabs=connect&error=${errorCode}`;
	};

	if (!instance || !code) {
		return redirect(getErrorRedirectPath("instance"));
	}

	try {
		const response = await apiMastodonAuthCallback(request, {
			code,
			instance,
			mode,
		});
		const data = await response.json();

		if ("error" in data) {
			// Handle specific error codes from API
			const errorCode =
				"code" in data && typeof data.code === "string"
					? data.code
					: "mastodon_oauth";
			return redirect(getErrorRedirectPath(errorCode));
		}

		if (data.success) {
			// Forward the Set-Cookie headers from the API response
			const headers = new Headers();
			const apiSetCookie = response.headers.get("set-cookie");
			if (apiSetCookie) {
				headers.append("set-cookie", apiSetCookie);
			}

			// Check if this was a login flow
			if ("isLogin" in data && data.isLogin) {
				// Redirect to main page for login with session cookie
				return redirect("/links", { headers });
			}

			// Check if this was a signup flow
			if ("isSignup" in data && data.isSignup) {
				// Redirect to download page for new signups (Mastodon is already connected)
				return redirect("/download?service=Mastodon", { headers });
			}

			// Otherwise it's a connect flow - redirect back to origin
			if (origin) {
				const originUrl = new URL(origin, url.origin);
				originUrl.searchParams.set("service", "Mastodon");
				return redirect(originUrl.pathname + originUrl.search, { headers });
			}
			return redirect("/download?service=Mastodon", { headers });
		}

		// Handle errors from API
		return redirect(getErrorRedirectPath("mastodon_oauth"));
	} catch (error) {
		console.error("Mastodon callback error:", error);
		return redirect(getErrorRedirectPath("mastodon_oauth"));
	}
};
