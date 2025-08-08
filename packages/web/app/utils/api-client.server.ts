import { redirect } from "react-router";
import { hc } from "hono/client";
import type { AppType } from "@sill/api";

// API URL for server-to-server communication within Docker
const API_BASE_URL = process.env.API_BASE_URL || "http://api:3001";

/**
 * Create a Hono RPC client with proper cookie forwarding
 */
function createApiClient(request: Request) {
	const cookieHeader = request.headers.get("cookie");
	const hostHeader = request.headers.get("host");
	const protoHeader = request.headers.get("x-forwarded-proto") || "http";

	return hc<AppType>(API_BASE_URL, {
		headers: {
			...(cookieHeader && { Cookie: cookieHeader }),
			...(hostHeader && { "X-Forwarded-Host": hostHeader }),
			"X-Forwarded-Proto": protoHeader,
		},
	});
}

/**
 * Get user profile with social accounts via API (returns null if not authenticated, no redirect)
 */
export async function apiGetUserProfileOptional(request: Request) {
	const client = createApiClient(request);
	const response = await client.api.auth.profile.$get();

	if (response.status === 401) {
		return null;
	}

	if (!response.ok) {
		throw new Error("Failed to get user profile");
	}

	return await response.json();
}

/**
 * Get user profile with social accounts via API
 * This handles authentication internally and throws redirect if not authenticated
 */
export async function apiGetUserProfile(request: Request, redirectTo?: string) {
	const userProfile = await apiGetUserProfileOptional(request);

	if (!userProfile) {
		// User not authenticated - redirect to login
		const requestUrl = new URL(request.url);
		const finalRedirectTo =
			redirectTo || `${requestUrl.pathname}${requestUrl.search}`;
		const loginParams = new URLSearchParams({ redirectTo: finalRedirectTo });
		throw redirect(`/accounts/login?${loginParams.toString()}`);
	}

	return userProfile;
}

/**
 * API-based version of requireUserId - throws redirect if not authenticated
 */
export async function requireUserId(
	request: Request,
	redirectTo?: string,
): Promise<string> {
	const userProfile = await apiGetUserProfile(request, redirectTo);
	return userProfile.id;
}

/**
 * API-based version of getUserId - returns null if not authenticated
 */
export async function getUserId(request: Request): Promise<string | null> {
	const userProfile = await apiGetUserProfileOptional(request);
	return userProfile?.id || null;
}

/**
 * API-based version of requireAnonymous - throws redirect if authenticated
 */
export async function requireAnonymous(request: Request): Promise<void> {
	const userProfile = await apiGetUserProfileOptional(request);

	if (userProfile) {
		throw redirect("/links");
	}
}

/**
 * Initiate signup with verification via API
 */
export async function apiSignupInitiate(
	request: Request,
	data: { email: string },
) {
	const client = createApiClient(request);
	const response = await client.api.auth.signup.initiate.$post({
		json: data,
	});

	if (!response.ok) {
		const errorData = await response.json();
		if ("error" in errorData) {
			throw new Error(errorData.error || "Signup initiation failed");
		}
	}

	return await response.json();
}

/**
 * Complete signup with verification code via API
 */
export async function apiSignupComplete(
	request: Request,
	data: { email: string; name: string; password: string },
) {
	const client = createApiClient(request);
	const response = await client.api.auth.signup.$post({
		json: data,
	});

	return response;
}

/**
 * Login via API
 */
export async function apiLogin(
	request: Request,
	data: { email: string; password: string },
) {
	const client = createApiClient(request);
	const response = await client.api.auth.login.$post({
		json: data,
	});

	return response;
}

/**
 * Logout via API
 */
export async function apiLogout(request: Request) {
	const client = createApiClient(request);
	const response = await client.api.auth.logout.$post();
	return response;
}

/**
 * Verify signup code via API
 */
export async function apiVerifyCode(
	request: Request,
	data: {
		code: string;
		type: "onboarding" | "reset-password" | "change-email" | "2fa";
		target: string;
	},
) {
	const client = createApiClient(request);
	const response = await client.api.auth.verify.$post({
		json: data,
	});

	return response;
}

/**
 * Start Bluesky OAuth authorization via API
 */
export async function apiBlueskyAuthStart(
	request: Request,
	handle: string | undefined,
) {
	const client = createApiClient(request);
	const response = await client.api.bluesky.auth.authorize.$get({
		query: {
			handle,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to start Bluesky authorization");
	}

	return await response.json();
}

/**
 * Complete Bluesky OAuth callback via API
 */
export async function apiBlueskyAuthCallback(
	request: Request,
	data: { searchParams: string },
) {
	const client = createApiClient(request);
	const response = await client.api.bluesky.auth.callback.$post({
		json: data,
	});

	return response;
}

/**
 * Start Mastodon OAuth authorization via API
 */
export async function apiMastodonAuthStart(
	request: Request,
	data: { instance: string },
) {
	const client = createApiClient(request);
	const response = await client.api.mastodon.auth.authorize.$get({
		query: data,
	});

	if (!response.ok) {
		throw new Error("Failed to start Mastodon authorization");
	}

	return await response.json();
}

/**
 * Complete Mastodon OAuth callback via API
 */
export async function apiMastodonAuthCallback(
	request: Request,
	data: { code: string; instance: string },
) {
	const client = createApiClient(request);
	const response = await client.api.mastodon.auth.callback.$post({
		json: data,
	});

	return response;
}

/**
 * Revoke Mastodon token via API
 */
export async function apiMastodonRevoke(request: Request) {
	const client = createApiClient(request);
	const response = await client.api.mastodon.auth.revoke.$post({});

	return response;
}

/**
 * Filter link occurrences via API
 */
export async function apiFilterLinkOccurrences(
	request: Request,
	params: {
		time?: number;
		hideReposts?: boolean;
		sort?: string;
		query?: string;
		service?: "mastodon" | "bluesky" | "all";
		page?: number;
		fetch?: boolean;
		selectedList?: string;
		limit?: number;
		url?: string;
		minShares?: number;
	},
) {
	// For now, use fetch directly since RPC client types aren't working
	const cookieHeader = request.headers.get("cookie");
	const hostHeader = request.headers.get("host");
	const protoHeader = request.headers.get("x-forwarded-proto") || "http";

	// Convert params to query string
	const queryParams = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== null) {
			queryParams.append(key, String(value));
		}
	}

	const response = await fetch(
		`${API_BASE_URL}/api/links/filter?${queryParams}`,
		{
			headers: {
				...(cookieHeader && { Cookie: cookieHeader }),
				...(hostHeader && { "X-Forwarded-Host": hostHeader }),
				"X-Forwarded-Proto": protoHeader,
			},
		},
	);

	if (!response.ok) {
		throw new Error("Failed to filter links");
	}

	return await response.json();
}
