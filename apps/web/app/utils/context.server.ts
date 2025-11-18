import { redirect, type unstable_RouterContextProvider } from "react-router";
import { userContext, type UserProfile } from "~/context/user-context";

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
    const finalRedirectTo = redirectTo || "/accounts/login";
    throw redirect(finalRedirectTo);
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
