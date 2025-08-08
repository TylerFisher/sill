import { useMatches } from "react-router";
import type { Route as RootRoute } from "~/+types/root";

/**
 * Get user profile from root loader data
 * This avoids making duplicate API calls since root loader already fetches user data
 */
export function useUserProfile(): RootRoute.LoaderData["dbUser"] {
	const matches = useMatches();
	const rootMatch = matches.find(match => match.id === "root");
	return rootMatch?.data?.dbUser || null;
}

/**
 * Get subscription status from root loader data
 */
export function useSubscriptionStatus(): RootRoute.LoaderData["subscribed"] {
	const matches = useMatches();
	const rootMatch = matches.find(match => match.id === "root");
	return rootMatch?.data?.subscribed || "free";
}

/**
 * Check if user is authenticated based on root loader data
 */
export function useIsAuthenticated(): boolean {
	const user = useUserProfile();
	return !!user;
}

/**
 * Get user ID from root loader data
 */
export function useUserId(): string | null {
	const user = useUserProfile();
	return user?.id || null;
}

/**
 * Server-side function to get cached user profile in loaders
 * This uses the request-scoped cache to avoid duplicate API calls
 * 
 * Usage in child loaders:
 * ```
 * const userProfile = await getCachedUserProfile(request);
 * if (!userProfile) {
 *   // Handle unauthenticated case
 * }
 * ```
 */
export async function getCachedUserProfile(request: Request) {
	// Import here to avoid circular dependencies
	const { apiGetUserProfileOptional } = await import("./api.server");
	return apiGetUserProfileOptional(request);
}

/**
 * Server-side function to require authentication using cached user profile
 * This uses the request-scoped cache to avoid duplicate API calls
 */
export async function requireCachedUserId(request: Request, redirectTo?: string): Promise<string> {
	const { requireUserId } = await import("./api.server");
	return requireUserId(request, redirectTo);
}