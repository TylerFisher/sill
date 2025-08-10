import { redirect } from "react-router";
import { hc } from "hono/client";
import type { AppType } from "@sill/api";

// API URL for server-to-server communication
// Defaults to localhost for local development, Docker service name for containerized
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";


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
		throw new Error(`Failed to get user profile: ${response.status}`);
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
		time: number;
		hideReposts: boolean;
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
	const client = createApiClient(request);
	const queryParams = Object.fromEntries(
		Object.entries(params)
			.filter(([_, value]) => value !== undefined)
			.map(([key, value]) => [key, String(value)]),
	);

	const response = await client.api.links.filter.$get({
		query: queryParams,
	});

	const json = await response.json();

	if ("error" in json) {
		throw new Error(json.error);
	}

	return json;
}

/**
 * List bookmarks via API
 */
export async function apiListBookmarks(
	request: Request,
	params?: {
		query?: string;
		page?: number;
		limit?: number;
	},
) {
	const client = createApiClient(request);
	const queryParams = params
		? Object.fromEntries(
				Object.entries(params)
					.filter(([_, value]) => value !== undefined)
					.map(([key, value]) => [key, String(value)]),
			)
		: {};

	const response = await client.api.bookmarks.$get({
		query: queryParams,
	});

	const json = await response.json();

	if ("error" in json) {
		throw new Error(json.error);
	}

	return json;
}

/**
 * Add a bookmark via API
 */
export async function apiAddBookmark(
	request: Request,
	data: { url: string },
) {
	const client = createApiClient(request);
	const response = await client.api.bookmarks.$post({
		json: data,
	});

	return response;
}

/**
 * Delete a bookmark via API
 */
export async function apiDeleteBookmark(
	request: Request,
	data: { url: string },
) {
	const client = createApiClient(request);
	const response = await client.api.bookmarks.$delete({
		json: data,
	});

	return response;
}

/**
 * Get digest items grouped by month via API
 */
export async function apiGetDigestItemsByMonth(request: Request) {
	const client = createApiClient(request);
	const response = await client.api.digest["by-month"].$get();

	if (!response.ok) {
		throw new Error(`Failed to get digest items: ${response.status}`);
	}

	const json = await response.json();

	if ("error" in json) {
		throw new Error(json.error as string);
	}

	return json;
}

/**
 * Get digest settings via API
 */
export async function apiGetDigestSettings(request: Request) {
	const client = createApiClient(request);
	const response = await client.api.digest.settings.$get();

	if (!response.ok) {
		throw new Error(`Failed to get digest settings: ${response.status}`);
	}

	const json = await response.json();

	if ("error" in json) {
		throw new Error(json.error as string);
	}

	return json;
}

/**
 * Create or update digest settings via API
 */
export async function apiCreateUpdateDigestSettings(
	request: Request,
	data: {
		time: string;
		hideReposts: boolean;
		splitServices: boolean;
		topAmount: number;
		layout: string;
		digestType: string;
	},
) {
	const client = createApiClient(request);
	const response = await client.api.digest.settings.$post({
		json: data,
	});

	return response;
}

/**
 * Delete digest settings via API
 */
export async function apiDeleteDigestSettings(request: Request) {
	const client = createApiClient(request);
	const response = await client.api.digest.settings.$delete();

	return response;
}

/**
 * Find links by author via API
 */
export async function apiFindLinksByAuthor(
	request: Request,
	params: {
		author: string;
		page?: number;
		pageSize?: number;
	},
) {
	const client = createApiClient(request);
	const queryParams = {
		author: params.author,
		...(params.page && { page: String(params.page) }),
		...(params.pageSize && { pageSize: String(params.pageSize) }),
	};

	const response = await client.api.links.author.$get({
		query: queryParams,
	});

	if (!response.ok) {
		throw new Error(`Failed to find links by author: ${response.status}`);
	}

	const json = await response.json();

	if ("error" in json) {
		throw new Error(json.error as string);
	}

	return json;
}

/**
 * Find links by domain via API
 */
export async function apiFindLinksByDomain(
	request: Request,
	params: {
		domain: string;
		page?: number;
		pageSize?: number;
	},
) {
	const client = createApiClient(request);
	const queryParams = {
		domain: params.domain,
		...(params.page && { page: String(params.page) }),
		...(params.pageSize && { pageSize: String(params.pageSize) }),
	};

	const response = await client.api.links.domain.$get({
		query: queryParams,
	});

	if (!response.ok) {
		throw new Error(`Failed to find links by domain: ${response.status}`);
	}

	const json = await response.json();

	if ("error" in json) {
		throw new Error(json.error as string);
	}

	return json;
}

/**
 * Find links by topic via API
 */
export async function apiFindLinksByTopic(
	request: Request,
	params: {
		topic: string;
		page?: number;
		pageSize?: number;
	},
) {
	const client = createApiClient(request);
	const queryParams = {
		topic: params.topic,
		...(params.page && { page: String(params.page) }),
		...(params.pageSize && { pageSize: String(params.pageSize) }),
	};

	const response = await client.api.links.topic.$get({
		query: queryParams,
	});

	if (!response.ok) {
		throw new Error(`Failed to find links by topic: ${response.status}`);
	}

	const json = await response.json();

	if ("error" in json) {
		throw new Error(json.error as string);
	}

	return json;
}

/**
 * Delete notification group via API
 */
export async function apiDeleteNotificationGroup(
	request: Request,
	groupId: string,
) {
	const client = createApiClient(request);
	const response = await client.api.notifications.groups[":groupId"].$delete({
		param: { groupId },
	});

	if (!response.ok) {
		throw new Error(`Failed to delete notification group: ${response.status}`);
	}

	const json = await response.json();

	if ("error" in json) {
		throw new Error(json.error as string);
	}

	return json;
}

/**
 * Test notifications via API
 */
export async function apiTestNotifications(
	request: Request,
	queries: Array<{
		category: {
			id: string;
			name: string;
			type: string;
			values?: Array<{
				id: string;
				name: string;
			}>;
		};
		operator: string;
		value: string | number;
	}>,
) {
	const client = createApiClient(request);
	const response = await client.api.notifications.test.$post({
		json: { queries },
	});

	if (!response.ok) {
		throw new Error(`Failed to test notifications: ${response.status}`);
	}

	const json = await response.json();

	if ("error" in json) {
		throw new Error(json.error as string);
	}

	return json;
}

/**
 * Get notification group feed data via API
 */
export async function apiGetNotificationGroupFeed(
	request: Request,
	notificationGroupId: string,
) {
	const client = createApiClient(request);
	const response = await client.api.notifications.groups[":notificationGroupId"].feed.$get({
		param: { notificationGroupId },
	});

	if (!response.ok) {
		throw new Error(`Failed to get notification group feed: ${response.status}`);
	}

	const json = await response.json();

	if ("error" in json) {
		throw new Error(json.error as string);
	}

	return json;
}

/**
 * Get all notification groups for logged in user via API
 */
export async function apiGetNotificationGroups(request: Request) {
	const client = createApiClient(request);
	const response = await client.api.notifications.groups.$get();

	if (!response.ok) {
		throw new Error(`Failed to get notification groups: ${response.status}`);
	}

	const json = await response.json();

	if ("error" in json) {
		throw new Error(json.error as string);
	}

	return json;
}

/**
 * Create or update notification group via API
 */
export async function apiCreateNotificationGroup(
	request: Request,
	data: {
		id?: string;
		format: "email" | "rss";
		queries: Array<{
			category: {
				id: string;
				name: string;
				type: string;
			};
			operator: string;
			value: string | number;
		}>;
		name: string;
	},
) {
	const client = createApiClient(request);
	const response = await client.api.notifications.groups.$post({
		json: data,
	});

	if (!response.ok) {
		throw new Error(`Failed to create notification group: ${response.status}`);
	}

	const json = await response.json();

	if ("error" in json) {
		throw new Error(json.error as string);
	}

	return json;
}

/**
 * Get latest terms update via API
 */
export async function apiGetLatestTermsUpdate(request: Request) {
	const client = createApiClient(request);
	const response = await client.api.terms.latest.$get();

	if (!response.ok) {
		throw new Error(`Failed to get latest terms update: ${response.status}`);
	}

	const json = await response.json();

	if ("error" in json) {
		throw new Error(json.error as string);
	}

	return json;
}

/**
 * Get terms agreement for user and terms update via API
 */
export async function apiGetTermsAgreement(
	request: Request,
	termsUpdateId: string,
) {
	const client = createApiClient(request);
	const response = await client.api.terms.agreement.$get({
		query: { termsUpdateId },
	});

	if (!response.ok) {
		throw new Error(`Failed to get terms agreement: ${response.status}`);
	}

	const json = await response.json();

	if ("error" in json) {
		throw new Error(json.error as string);
	}

	return json;
}

/**
 * Insert terms agreement via API
 */
export async function apiInsertTermsAgreement(
	request: Request,
	termsUpdateId: string,
) {
	const client = createApiClient(request);
	const response = await client.api.terms.agreement.$post({
		json: { termsUpdateId },
	});

	if (!response.ok) {
		throw new Error(`Failed to insert terms agreement: ${response.status}`);
	}

	const json = await response.json();

	if ("error" in json) {
		throw new Error(json.error as string);
	}

	return json;
}
