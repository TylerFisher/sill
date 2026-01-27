import { redirect } from "react-router";
import { apiMastodonAuthStart } from "~/utils/api-client.server";
import { createInstanceCookie } from "~/utils/session.server";
import type { Route } from "./+types/auth";

export const loader = async ({ request }: Route.LoaderArgs) => {
	const requestUrl = new URL(request.url);
	const refererHeader = request.headers.get("referer");

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
		const result = await apiMastodonAuthStart(request, { instance, mode });

		if ("error" in result) {
			throw new Error(result.error);
		}

		// Create instance cookie and redirect to authorization URL
		// Store the referrer so we can redirect back after OAuth
		return await createInstanceCookie(
			request,
			result.instance,
			result.redirectUrl,
			mode || undefined,
			referrer,
		);
	} catch (error) {
		console.error("Mastodon auth error:", error);

		// Build error redirect URL
		const buildErrorUrl = (errorCode: string) => {
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
