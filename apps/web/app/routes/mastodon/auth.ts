import { redirect } from "react-router";
import {
	apiMastodonAuthStart,
	apiCreateMobileCode,
	apiExchangeMobileCode,
} from "~/utils/api-client.server";
import { authSessionStorage } from "~/utils/session.server";
import type { Route } from "./+types/auth";

function hasSessionCookie(request: Request): boolean {
	const header = request.headers.get("cookie");
	if (!header) return false;
	return header
		.split(";")
		.some((part) => part.trim().startsWith("sessionId="));
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
	const requestUrl = new URL(request.url);
	const refererHeader = request.headers.get("referer");
	const mobile = requestUrl.searchParams.get("mobile") === "1";
	const mobileCode = requestUrl.searchParams.get("code");

	// Extract pathname from referrer, defaulting to settings if not available or just root
	let referrer = "/settings?tabs=connect";
	if (refererHeader) {
		try {
			const refererUrl = new URL(refererHeader);
			// Only use the referrer if it has a meaningful path (not just root)
			if (refererUrl.pathname && refererUrl.pathname !== "/") {
				referrer = refererUrl.pathname + refererUrl.search;
			}
		} catch {
			// If it's already a path, use it directly
			if (refererHeader.startsWith("/") && refererHeader !== "/") {
				referrer = refererHeader;
			}
		}
	}

	const instance = requestUrl.searchParams.get("instance");
	const modeParam = requestUrl.searchParams.get("mode");
	const mode = modeParam === "login" || modeParam === "signup" ? modeParam : undefined;
	// Where to send the user after a successful login (set by the auth gate).
	const redirectTo = requestUrl.searchParams.get("redirectTo");

	// If the mobile app opens the sign-in flow but the user is already signed
	// into Sill in Safari (ASWebAuthenticationSession shares Safari's cookie
	// jar), skip the full Mastodon OAuth round trip and hand a mobile code
	// straight back to the app. `mobileCode` present means the connect flow,
	// which needs the OAuth path below.
	if (mobile && !mobileCode && hasSessionCookie(request)) {
		try {
			// No sessionId arg: the API validates the forwarded session cookie
			// and only mints a code if the web session is genuinely valid.
			const { code } = await apiCreateMobileCode(request);
			return redirect(
				`sill://callback?code=${encodeURIComponent(code)}&isSignup=0`,
			);
		} catch (error) {
			// Session turned out invalid/expired — fall through to normal OAuth.
			console.error("Mobile session shortcut failed:", error);
		}
	}

	if (!instance) {
		return null;
	}

	try {
		// For mobile connect flow, exchange the code for the real sessionId
		// and inject it into the cookie header before calling the API
		let apiRequest = request;
		let mobileSessionId: string | undefined;
		if (mobile && mobileCode) {
			const { sessionId } = await apiExchangeMobileCode(
				request,
				mobileCode,
			);
			mobileSessionId = sessionId;
			apiRequest = injectSessionId(request, sessionId);
		}

		const result = await apiMastodonAuthStart(apiRequest, { instance, mode });

		if ("error" in result) {
			throw new Error(result.error);
		}

		// Set cookies to persist mode, origin, instance, and mobile flag across OAuth redirect
		const session = await authSessionStorage.getSession(
			request.headers.get("cookie"),
		);

		session.set("instance", result.instance);

		if (mode) {
			session.set("mastodonMode", mode);
		} else {
			session.unset("mastodonMode");
		}

		// Carry the post-login return URL through the OAuth round trip (login only).
		if (mode === "login" && redirectTo) {
			session.set("mastodonRedirectTo", redirectTo);
		} else {
			session.unset("mastodonRedirectTo");
		}

		session.set("mastodonOrigin", referrer);

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
		console.error("Mastodon auth error:", error);

		// Build error redirect URL
		const buildErrorUrl = (errorCode: string) => {
			if (mobile && mobileCode) return `sill://callback?error=${errorCode}`;
			const errorUrl = new URL(referrer, requestUrl.origin);
			errorUrl.searchParams.set("error", errorCode);
			return errorUrl.pathname + errorUrl.search;
		};

		// Handle specific error codes
		if (error instanceof Error && error.message.includes("instance")) {
			return redirect(buildErrorUrl("instance"));
		}

		// Generic error fallback
		return redirect(buildErrorUrl("oauth"));
	}
};
