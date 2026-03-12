import { redirect } from "react-router";
import { apiBlueskyAuthStart } from "~/utils/api-client.server";
import { authSessionStorage } from "~/utils/session.server";
import type { Route } from "./+types/auth";

/**
 * When the mobile app needs to connect an additional account, the
 * ASWebAuthenticationSession browser doesn't carry the iOS app's session
 * cookie.  The mobile app passes its API sessionId as a query parameter so
 * we can inject it into the cookie header before calling the API.
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
	const requestUrl = new URL(request.url);
	const refererHeader = request.headers.get("referer");
	const handle = requestUrl.searchParams.get("handle");
	const mode = requestUrl.searchParams.get("mode") as
		| "login"
		| "signup"
		| undefined;
	const mobile = requestUrl.searchParams.get("mobile") === "1";
	const mobileSessionId = requestUrl.searchParams.get("sessionId");

	// Extract pathname from referrer, defaulting to settings if not available or just root
	let origin = "/settings?tabs=connect";
	if (refererHeader) {
		try {
			const refererUrl = new URL(refererHeader);
			// Only use the referrer if it has a meaningful path (not just root)
			if (refererUrl.pathname && refererUrl.pathname !== "/") {
				origin = refererUrl.pathname + refererUrl.search;
			}
		} catch {
			// If it's already a path, use it directly
			if (refererHeader.startsWith("/") && refererHeader !== "/") {
				origin = refererHeader;
			}
		}
	}

	// Determine where to redirect on error based on mode and origin
	const getErrorRedirectPath = () => {
		if (mobile && mobileSessionId) return "sill://callback";
		if (mode === "login") return "/accounts/login";
		if (mode === "signup") return "/accounts/signup";
		return origin;
	};

	try {
		// For mobile connect flow, inject the iOS session cookie
		const apiRequest =
			mobile && mobileSessionId
				? injectSessionId(request, mobileSessionId)
				: request;

		const result = await apiBlueskyAuthStart(
			apiRequest,
			handle || undefined,
			mode || undefined,
		);

		// Set cookies to persist mode, origin, and mobile flag across OAuth redirect
		const session = await authSessionStorage.getSession(
			request.headers.get("cookie"),
		);

		if (mode) {
			session.set("blueskyMode", mode);
			if (origin) {
				session.set("blueskyOrigin", origin);
			}
		} else {
			session.set("blueskyOrigin", origin);
			session.unset("blueskyMode");
		}

		if (mobile) {
			session.set("mobile", true);
		}

		// Store the API sessionId so the callback route can forward it too
		if (mobileSessionId) {
			session.set("apiSessionId", mobileSessionId);
		}

		const headers = new Headers();
		headers.append(
			"Set-Cookie",
			await authSessionStorage.commitSession(session),
		);

		return redirect(result.redirectUrl, { headers });
	} catch (error) {
		console.error("Bluesky auth error:", error);

		const errorPath = getErrorRedirectPath();
		const errorCode =
			(error as Error & { code?: string }).code ||
			(error instanceof Error && error.message.includes("resolver")
				? "resolver"
				: "oauth");

		const errorUrl = new URL(errorPath, requestUrl.origin);
		errorUrl.searchParams.set("error", errorCode);
		return redirect(errorUrl.pathname + errorUrl.search);
	}
};
