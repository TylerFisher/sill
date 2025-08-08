import { redirect } from "react-router";
import { userContext, type UserProfile } from "~/context/user-context";

/**
 * Get user profile from context (set by middleware)
 */
export function getUserFromContext(context: any): UserProfile | null {
	return context.get(userContext);
}

/**
 * Require user to be authenticated - throws redirect if not
 */
export function requireUserFromContext(context: any, redirectTo?: string): UserProfile {
	const user = getUserFromContext(context);
	
	if (!user) {
		const finalRedirectTo = redirectTo || "/accounts/login";
		throw redirect(finalRedirectTo);
	}
	
	return user;
}

/**
 * Get user ID from context
 */
export function getUserIdFromContext(context: any): string | null {
	const user = getUserFromContext(context);
	return user?.id || null;
}

/**
 * Require user to be anonymous - throws redirect if authenticated
 */
export function requireAnonymousFromContext(context: any): void {
	const user = getUserFromContext(context);
	
	if (user) {
		throw redirect("/links");
	}
}