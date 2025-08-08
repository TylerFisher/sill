import { redirect } from "react-router";

// API URL for server-to-server communication within Docker
const API_BASE_URL = process.env.API_BASE_URL || "http://api:3001";


/**
 * Helper to make API calls with proper cookie forwarding
 */
async function apiRequest(
	request: Request,
	endpoint: string,
	options: RequestInit = {},
): Promise<Response> {
	const cookieHeader = request.headers.get("cookie");
	const hostHeader = request.headers.get("host");
	const protoHeader = request.headers.get("x-forwarded-proto") || "http";
	const url = `${API_BASE_URL}${endpoint}`;

	try {
		const response = await fetch(url, {
			headers: {
				"Content-Type": "application/json",
				...(cookieHeader && { Cookie: cookieHeader }),
				...(hostHeader && { "X-Forwarded-Host": hostHeader }),
				"X-Forwarded-Proto": protoHeader,
				...options.headers,
			},
			...options,
		});

		return response;
	} catch (error) {
		console.error("API request failed:", url, error);
		throw error;
	}
}

/**
 * Login via API
 */
export async function apiLogin(
	request: Request,
	data: {
		email: string;
		password: string;
		remember?: boolean;
		redirectTo?: string;
	},
) {
	const response = await apiRequest(request, "/api/auth/login", {
		method: "POST",
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const errorData = await response.json();
		throw new Error(errorData.error || "Login failed");
	}

	return {
		response,
		data: await response.json(),
	};
}

/**
 * Signup via API
 */
export async function apiSignup(
	request: Request,
	data: {
		email: string;
		name: string;
		password: string;
	},
) {
	const response = await apiRequest(request, "/api/auth/signup", {
		method: "POST",
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const errorData = await response.json();
		throw new Error(errorData.error || "Signup failed");
	}

	return {
		response,
		data: await response.json(),
	};
}

/**
 * Logout via API
 */
export async function apiLogout(request: Request) {
	const response = await apiRequest(request, "/api/auth/logout", {
		method: "POST",
	});

	if (!response.ok) {
		const errorData = await response.json();
		throw new Error(errorData.error || "Logout failed");
	}

	return {
		response,
		data: await response.json(),
	};
}

/**
 * Get current user via API
 */
export async function apiGetCurrentUser(request: Request) {
	try {
		const response = await apiRequest(request, "/api/auth/me", {
			method: "GET",
		});

		if (!response.ok) {
			if (response.status === 401) {
				return null;
			}
			const errorData = await response.json();
			throw new Error(errorData.error || "Failed to get user");
		}

		return await response.json();
	} catch (error) {
		return null;
	}
}

/**
 * Get user profile with social accounts via API (returns null if not authenticated, no redirect)
 */
export async function apiGetUserProfileOptional(request: Request) {
	const response = await apiRequest(request, "/api/auth/profile", {
		method: "GET",
	});

	if (response.status === 401) {
		return null;
	}

	if (!response.ok) {
		throw new Error("Failed to get user profile");
	}

	return await response.json();
}

/**
 * API-based version of requireUserId - throws redirect if not authenticated
 */
export async function requireUserId(request: Request, redirectTo?: string): Promise<string> {
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
	data: {
		email: string;
	},
) {
	const response = await apiRequest(request, "/api/auth/signup/initiate", {
		method: "POST",
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const errorData = await response.json();
		throw new Error(errorData.error || "Failed to initiate signup");
	}

	return await response.json();
}

/**
 * Verify email code via API
 */
export async function apiVerify(
	request: Request,
	data: {
		code: string;
		type: string;
		target: string;
		redirectTo?: string;
	},
) {
	const response = await apiRequest(request, "/api/auth/verify", {
		method: "POST",
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const errorData = await response.json();
		throw new Error(errorData.error || "Verification failed");
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
		const finalRedirectTo = redirectTo || `${requestUrl.pathname}${requestUrl.search}`;
		const loginParams = new URLSearchParams({ redirectTo: finalRedirectTo });
		throw redirect(`/accounts/login?${loginParams.toString()}`);
	}

	return userProfile;
}

/**
 * Start Bluesky OAuth authorization via API
 */
export async function apiBlueskyAuthorize(request: Request, handle?: string) {
	const params = new URLSearchParams();
	if (handle) {
		params.set('handle', handle);
	}
	
	const response = await apiRequest(request, `/api/bluesky/auth/authorize?${params}`, {
		method: "GET",
	});

	if (!response.ok) {
		const errorData = await response.json();
		throw new Error(errorData.error || "Failed to start Bluesky authorization");
	}

	return await response.json();
}

/**
 * Complete Bluesky OAuth callback via API
 */
export async function apiBlueskyCallback(request: Request, searchParams: URLSearchParams) {
	const response = await apiRequest(request, "/api/bluesky/auth/callback", {
		method: "POST",
		body: JSON.stringify({ searchParams: searchParams.toString() }),
	});

	if (!response.ok) {
		const errorData = await response.json();
		throw new Error(errorData.error || "Failed to complete Bluesky authorization");
	}

	return await response.json();
}

/**
 * Start Mastodon OAuth authorization via API
 */
export async function apiMastodonAuthorize(request: Request, instance: string) {
	const params = new URLSearchParams({ instance });
	
	const response = await apiRequest(request, `/api/mastodon/auth/authorize?${params}`, {
		method: "GET",
	});

	if (!response.ok) {
		const errorData = await response.json();
		throw new Error(errorData.error || "Failed to start Mastodon authorization");
	}

	return await response.json();
}

/**
 * Complete Mastodon OAuth callback via API
 */
export async function apiMastodonCallback(request: Request, code: string, instance: string) {
	const response = await apiRequest(request, "/api/mastodon/auth/callback", {
		method: "POST",
		body: JSON.stringify({ code, instance }),
	});

	if (!response.ok) {
		const errorData = await response.json();
		throw new Error(errorData.error || "Failed to complete Mastodon authorization");
	}

	return await response.json();
}

/**
 * Revoke Mastodon access token via API
 */
export async function apiMastodonRevoke(request: Request) {
	const response = await apiRequest(request, "/api/mastodon/auth/revoke", {
		method: "POST",
	});

	if (!response.ok) {
		const errorData = await response.json();
		throw new Error(errorData.error || "Failed to revoke Mastodon authorization");
	}

	return await response.json();
}

/**
 * API-based version of requireUserId that returns user ID from profile call
 * @deprecated Use apiGetUserProfile instead for better efficiency
 */
