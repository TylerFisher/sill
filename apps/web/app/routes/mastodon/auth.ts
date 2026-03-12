import { redirect } from "react-router";
import { apiMastodonAuthStart } from "~/utils/api-client.server";
import { authSessionStorage } from "~/utils/session.server";
import type { Route } from "./+types/auth";

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
	const mobileSessionId = requestUrl.searchParams.get("sessionId");

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

	if (!instance) {
		return null;
	}

	try {
		// For mobile connect flow, inject the iOS session cookie
		const apiRequest =
			mobile && mobileSessionId
				? injectSessionId(request, mobileSessionId)
				: request;

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
			if (mobile && mobileSessionId) return `sill://callback?error=${errorCode}`;
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
