import { redirect } from "react-router";
import { apiMastodonAuthCallback } from "~/utils/api-client.server";
import { authSessionStorage } from "~/utils/session.server";
import type { Route } from "./+types/auth.callback";

function extractSessionId(setCookieHeader: string): string | null {
	for (const part of setCookieHeader.split(";")) {
		const trimmed = part.trim();
		if (trimmed.startsWith("sessionId=")) {
			return trimmed.slice("sessionId=".length);
		}
	}
	return null;
}

/**
 * Inject the API sessionId cookie into the request for mobile connect flows.
 */
function injectSessionId(request: Request, sessionId: string): Request {
	const headers = new Headers(request.headers);
	const existing = headers.get("cookie") || "";
	headers.set(
		"cookie",
		existing
			? `${existing}; sessionId=${sessionId}`
			: `sessionId=${sessionId}`,
	);
	return new Request(request.url, {
		method: request.method,
		headers,
	});
}

export const loader = async ({ request }: Route.LoaderArgs) => {
	const url = new URL(request.url);

	// Read instance, mode, origin, and mobile flag from session cookie
	const session = await authSessionStorage.getSession(
		request.headers.get("cookie"),
	);
	const instance = session.get("instance") as string | undefined;
	const mode = session.get("mastodonMode") as
		| "login"
		| "signup"
		| undefined;
	const origin = session.get("mastodonOrigin") as string | undefined;
	const isMobile = session.get("mobile") === true;
	const apiSessionId = session.get("apiSessionId") as string | undefined;
	const code = url.searchParams.get("code");

	// Determine where to redirect on error based on mode and origin
	const getErrorRedirectPath = (errorCode: string) => {
		if (isMobile) return `sill://callback?error=${errorCode}`;
		if (mode === "login") return `/accounts/login?error=${errorCode}`;
		if (mode === "signup") return `/accounts/signup?error=${errorCode}`;
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

	// For mobile connect flow, inject the stored API session cookie
	const apiRequest =
		isMobile && apiSessionId
			? injectSessionId(request, apiSessionId)
			: request;

	try {
		const response = await apiMastodonAuthCallback(apiRequest, {
			code,
			instance,
			mode,
		});
		const data = await response.json();

		if ("error" in data) {
			const errorCode =
				"code" in data && typeof data.code === "string"
					? data.code
					: "mastodon_oauth";
			return redirect(getErrorRedirectPath(errorCode));
		}

		if (data.success) {
			const apiSetCookie = response.headers.get("set-cookie");

			// Mobile flow: redirect to custom URL scheme with sessionId
			if (isMobile) {
				session.unset("mobile");
				session.unset("mastodonMode");
				session.unset("mastodonOrigin");
				session.unset("instance");
				session.unset("apiSessionId");
				const headers = new Headers();
				headers.append(
					"Set-Cookie",
					await authSessionStorage.commitSession(session),
				);

				const sessionId = apiSetCookie
					? extractSessionId(apiSetCookie)
					: null;
				const isSignup =
					"isSignup" in data && data.isSignup ? "1" : "0";
				const isConnect =
					!("isLogin" in data && data.isLogin) &&
					!("isSignup" in data && data.isSignup);

				let mobileUrl: string;
				if (sessionId) {
					mobileUrl = `sill://callback?sessionId=${encodeURIComponent(sessionId)}&isSignup=${isSignup}`;
				} else if (isConnect) {
					// Connect flow: no new session cookie — the iOS app already has one
					mobileUrl = "sill://callback?connected=1";
				} else {
					mobileUrl = "sill://callback?error=no_session";
				}
				return redirect(mobileUrl, { headers });
			}

			// Web flow: forward the Set-Cookie headers from the API response
			const headers = new Headers();
			if (apiSetCookie) {
				headers.append("set-cookie", apiSetCookie);
			}

			if ("isLogin" in data && data.isLogin) {
				return redirect("/links", { headers });
			}

			if ("isSignup" in data && data.isSignup) {
				return redirect("/download?service=Mastodon", { headers });
			}

			if (origin) {
				const originUrl = new URL(origin, url.origin);
				originUrl.searchParams.set("service", "Mastodon");
				return redirect(originUrl.pathname + originUrl.search, {
					headers,
				});
			}
			return redirect("/download?service=Mastodon", { headers });
		}

		return redirect(getErrorRedirectPath("mastodon_oauth"));
	} catch (error) {
		console.error("Mastodon callback error:", error);
		return redirect(getErrorRedirectPath("mastodon_oauth"));
	}
};
