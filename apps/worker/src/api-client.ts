import { hc } from "hono/client";
import type { AppType } from "@sill/api";

// API URL for worker-to-API communication
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";

/**
 * Create a Hono RPC client for worker use
 */
function createApiClient() {
	return hc<AppType>(API_BASE_URL, {
		headers: {
			"X-Worker-Client": "true",
		},
	});
}

/**
 * Check subscription status for a user
 */
export async function apiCheckSubscription(userId: string) {
	const client = createApiClient();
	const response = await client.api.auth.profile.$get({
		headers: {
			"X-User-ID": userId,
		},
	});

	if (!response.ok) {
		throw new Error(`Failed to get user profile: ${response.status}`);
	}

	const profile = await response.json();
	if ("error" in profile) {
		throw new Error(profile.error as string);
	}

	return profile;
}

/**
 * Send email notification via API
 */
export async function apiSendNotificationEmail(data: {
	to: string;
	subject: string;
	links: Array<{
		link?: { title?: string; url?: string } | null;
		[key: string]: unknown;
	}>;
	groupName: string;
	subscribed: string;
	freeTrialEnd: Date | null;
}) {
	const client = createApiClient();
	const response = await client.api.newsletter.notification.$post({
		json: data,
	});

	if (!response.ok) {
		throw new Error(`Failed to send notification email: ${response.status}`);
	}

	const result = await response.json();
	if ("error" in result) {
		throw new Error(result.error as string);
	}

	return result;
}