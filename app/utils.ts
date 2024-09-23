import { useMatches } from "@remix-run/react";
import { useMemo } from "react";

import type { User } from "./models/user.server";

const DEFAULT_REDIRECT = "/";

const CLIENT_ID = process.env.MASTODON_CLIENT_ID;
const CLIENT_SECRET = process.env.MASTODON_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI as string; // e.g., 'http://localhost:3000/auth

/**
 * This should be used any time the redirect path is user-provided
 * (Like the query string on our login/signup pages). This avoids
 * open-redirect vulnerabilities.
 * @param {string} to The redirect destination
 * @param {string} defaultRedirect The redirect to use if the to is unsafe.
 */
export function safeRedirect(
	to: FormDataEntryValue | string | null | undefined,
	defaultRedirect: string = DEFAULT_REDIRECT,
) {
	if (!to || typeof to !== "string") {
		return defaultRedirect;
	}

	if (!to.startsWith("/") || to.startsWith("//")) {
		return defaultRedirect;
	}

	return to;
}

/**
 * This base hook is used in other hooks to quickly search for specific data
 * across all loader data using useMatches.
 * @param {string} id The route id
 * @returns {JSON|undefined} The router data or undefined if not found
 */
export function useMatchesData(
	id: string,
): Record<string, unknown> | undefined {
	const matchingRoutes = useMatches();
	const route = useMemo(
		() => matchingRoutes.find((route) => route.id === id),
		[matchingRoutes, id],
	);
	return route?.data as Record<string, unknown>;
}

function isUser(user: unknown): user is User {
	return (
		user != null &&
		typeof user === "object" &&
		"email" in user &&
		typeof user.email === "string"
	);
}

export function useOptionalUser(): User | undefined {
	const data = useMatchesData("root");
	if (!data || !isUser(data.user)) {
		return undefined;
	}
	return data.user;
}

export function useUser(): User {
	const maybeUser = useOptionalUser();
	if (!maybeUser) {
		throw new Error(
			"No user found in root loader, but user is required by useUser. If user is optional, try useOptionalUser instead.",
		);
	}
	return maybeUser;
}

export function validateEmail(email: unknown): email is string {
	return typeof email === "string" && email.length > 3 && email.includes("@");
}

export const getAuthorizationUrl = (instance: string) => {
	return `${instance}/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&instance=${encodeURIComponent(instance)}`;
};

export const getAccessToken = async (instance: string, code: string) => {
	const response = await fetch(`${instance}/oauth/token`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			client_id: CLIENT_ID,
			client_secret: CLIENT_SECRET,
			redirect_uri: REDIRECT_URI,
			code,
			grant_type: "authorization_code",
		}),
	});
	return response.json(); // This will include access_token, token_type, etc.
};
