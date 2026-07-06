import { redirect, type unstable_RouterContextProvider } from "react-router";
import {
  requestUrlContext,
  userContext,
  type UserProfile,
} from "~/context/user-context";

/**
 * Get user profile from context (set by middleware)
 */
export async function getUserFromContext(
  context: Readonly<unstable_RouterContextProvider>
): Promise<UserProfile | null> {
  return context.get(userContext);
}

/**
 * Require user to be authenticated - throws redirect if not
 */
export async function requireUserFromContext(
  context: Readonly<unstable_RouterContextProvider>,
  redirectTo?: string
): Promise<UserProfile> {
  const user = await getUserFromContext(context);

  if (!user) {
    if (redirectTo) {
      throw redirect(redirectTo);
    }
    // Send them to login carrying where they were headed, so login (and the
    // OAuth callbacks) can return them there afterward.
    const requested = context.get(requestUrlContext);
    throw redirect(
      requested
        ? `/accounts/login?redirectTo=${encodeURIComponent(requested)}`
        : "/accounts/login"
    );
  }

  return user;
}

/**
 * Get user ID from context
 */
export async function getUserIdFromContext(
  context: Readonly<unstable_RouterContextProvider>
): Promise<string | null> {
  const user = await getUserFromContext(context);
  return user?.id || null;
}

/**
 * Require user to be anonymous - throws redirect if authenticated
 */
export async function requireAnonymousFromContext(
  context: Readonly<unstable_RouterContextProvider>
): Promise<void> {
  const user = await getUserFromContext(context);

  if (user) {
    throw redirect("/links");
  }
}
