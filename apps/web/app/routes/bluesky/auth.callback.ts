import { redirect } from "react-router";
import { apiBlueskyAuthCallback } from "~/utils/api-client.server";
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

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url);

	// Read auth mode, origin, and mobile flag from session cookie
	const session = await authSessionStorage.getSession(
		request.headers.get("cookie"),
	);
	const authMode = session.get("blueskyMode") as
		| "login"
		| "signup"
		| undefined;
	const origin = session.get("blueskyOrigin") as string | undefined;
	const isMobile = session.get("mobile") === true;
	const apiSessionId = session.get("apiSessionId") as string | undefined;

	// Helper to build error redirect path based on mode and origin
	const getErrorRedirectPath = (errorCode: string) => {
		if (isMobile) return `sill://callback?error=${errorCode}`;
		if (authMode === "login") return `/accounts/login?error=${errorCode}`;
		if (authMode === "signup") return `/accounts/signup?error=${errorCode}`;
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

	// For mobile connect flow, inject the stored API session cookie
	const apiRequest =
		isMobile && apiSessionId
			? injectSessionId(request, apiSessionId)
			: request;

	try {
		const result = await apiBlueskyAuthCallback(apiRequest, callbackData);
		const data = await result.json();

		if ("error" in data) {
			if (data.error === "login_required") {
				//@ts-expect-error: idk about this yet
				return redirect(data.redirectUrl);
			}
			throw new Error(data.error);
		}

		if (data.success) {
			const apiSetCookie = result.headers.get("set-cookie");

			// Mobile flow: redirect to custom URL scheme with sessionId
			if (isMobile) {
				// Clear mobile and bluesky cookies
				session.unset("mobile");
				session.unset("blueskyMode");
				session.unset("blueskyOrigin");
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

			// Web flow: clear mode cookie and forward API session cookie
			session.unset("blueskyMode");
			session.unset("blueskyOrigin");
			const clearModeHeaders = new Headers();
			clearModeHeaders.append(
				"Set-Cookie",
				await authSessionStorage.commitSession(session),
			);
			if (apiSetCookie) {
				clearModeHeaders.append("set-cookie", apiSetCookie);
			}

			if ("isLogin" in data && data.isLogin) {
				return redirect("/links", { headers: clearModeHeaders });
			}

			if ("isSignup" in data && data.isSignup) {
				return redirect("/download?service=Bluesky", {
					headers: clearModeHeaders,
				});
			}

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

		return redirect(getErrorRedirectPath("oauth"));
	} catch (error) {
		console.error("Bluesky callback error:", error);

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

		return redirect(getErrorRedirectPath("oauth"));
	}
}
