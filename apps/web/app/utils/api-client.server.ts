import { redirect } from "react-router";
import { hc } from "hono/client";
import type { AppType } from "@sill/api";
import type { link } from "@sill/schema";

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
  redirectTo?: string
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
  data: { email: string }
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
  data: { email: string; name: string; password: string }
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
  data: { email: string; password: string }
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
  }
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
  handle: string | undefined
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
  data: { searchParams: string }
) {
  const client = createApiClient(request);
  const response = await client.api.bluesky.auth.callback.$post({
    json: data,
  });

  return response;
}

/**
 * Revoke Bluesky access
 */
export async function apiBlueskyAuthRevoke(request: Request) {
  const client = createApiClient(request);
  const response = await client.api.bluesky.auth.revoke.$delete();

  if (!response.ok) {
    throw new Error("Failed to revoke Bluesky account");
  }

  return await response.json();
}

/**
 * Start Mastodon OAuth authorization via API
 */
export async function apiMastodonAuthStart(
  request: Request,
  data: { instance: string }
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
  data: { code: string; instance: string }
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
  }
) {
  const client = createApiClient(request);
  const queryParams = Object.fromEntries(
    Object.entries(params)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)])
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
    tag?: string;
    page?: number;
    limit?: number;
  }
) {
  const client = createApiClient(request);
  const queryParams = params
    ? Object.fromEntries(
        Object.entries(params)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)])
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
  data: { url: string; tags?: string; publishToAtproto?: boolean }
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
  data: { url: string }
) {
  const client = createApiClient(request);
  const response = await client.api.bookmarks.$delete({
    json: data,
  });

  return response;
}

/**
 * Get all tags for the user via API
 */
export async function apiGetBookmarkTags(request: Request) {
  const client = createApiClient(request);
  const response = await client.api.bookmarks.tags.$get();

  if (!response.ok) {
    throw new Error(`Failed to get bookmark tags: ${response.status}`);
  }

  const json = await response.json();

  if ("error" in json) {
    throw new Error(json.error as string);
  }

  return json;
}

/**
 * Delete a tag from a bookmark via API
 */
export async function apiDeleteBookmarkTag(
  request: Request,
  data: { url: string; tagName: string }
) {
  const client = createApiClient(request);
  const response = await client.api.bookmarks.tag.$delete({
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
  }
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
  }
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
  }
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
  }
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
  groupId: string
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
  }>
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
  notificationGroupId: string
) {
  const client = createApiClient(request);
  const response = await client.api.notifications.groups[
    ":notificationGroupId"
  ].feed.$get({
    param: { notificationGroupId },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to get notification group feed: ${response.status}`
    );
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
  }
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
  termsUpdateId: string
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
  termsUpdateId: string
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

/**
 * Delete current user account via API
 */
export async function apiDeleteUser(request: Request) {
  const client = createApiClient(request);
  const response = await client.api.auth.user.$delete();

  if (!response.ok) {
    throw new Error(`Failed to delete user: ${response.status}`);
  }

  const json = await response.json();

  if ("error" in json) {
    throw new Error(json.error as string);
  }

  return json;
}

/**
 * Verify current password via API
 */
export async function apiVerifyPassword(request: Request, password: string) {
  const client = createApiClient(request);
  const response = await client.api.auth["verify-password"].$post({
    json: { password },
  });

  if (!response.ok) {
    throw new Error(`Failed to verify password: ${response.status}`);
  }

  const json = await response.json();

  if ("error" in json) {
    throw new Error(json.error as string);
  }

  return json;
}

/**
 * Change user password via API (without verification)
 */
export async function apiChangePassword(request: Request, newPassword: string) {
  const client = createApiClient(request);
  const response = await client.api.auth.password.$put({
    json: { newPassword },
  });

  if (!response.ok) {
    throw new Error(`Failed to change password: ${response.status}`);
  }

  const json = await response.json();

  if ("error" in json) {
    throw new Error(json.error as string);
  }

  return json;
}

/**
 * Get all mute phrases for user via API
 */
export async function apiGetMutePhrases(request: Request) {
  const client = createApiClient(request);
  const response = await client.api.mute.phrases.$get();

  if (!response.ok) {
    throw new Error(`Failed to get mute phrases: ${response.status}`);
  }

  const json = await response.json();

  if ("error" in json) {
    throw new Error(json.error as string);
  }

  return json;
}

/**
 * Add new mute phrase via API
 */
export async function apiAddMutePhrase(request: Request, phrase: string) {
  const client = createApiClient(request);
  const response = await client.api.mute.phrases.$post({
    json: { phrase },
  });

  if (!response.ok) {
    throw new Error(`Failed to add mute phrase: ${response.status}`);
  }

  const json = await response.json();

  if ("error" in json) {
    throw new Error(json.error as string);
  }

  return json;
}

/**
 * Delete mute phrase via API
 */
export async function apiDeleteMutePhrase(request: Request, phrase: string) {
  const client = createApiClient(request);
  const response = await client.api.mute.phrases.$delete({
    json: { phrase },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete mute phrase: ${response.status}`);
  }

  const json = await response.json();

  if ("error" in json) {
    throw new Error(json.error as string);
  }

  return json;
}

/**
 * Get digest feed data for RSS generation via API
 */
export async function apiGetDigestFeed(request: Request, userId: string) {
  const client = createApiClient(request);
  const response = await client.api.digest.feed[":userId"].$get({
    param: { userId },
  });

  if (!response.ok) {
    throw new Error(`Failed to get digest feed: ${response.status}`);
  }

  const json = await response.json();

  if ("error" in json) {
    throw new Error(json.error as string);
  }

  return json;
}

/**
 * Get individual digest item via API
 */
export async function apiGetDigestItem(request: Request, itemId: string) {
  const client = createApiClient(request);
  const response = await client.api.digest.item[":itemId"].$get({
    param: { itemId },
  });

  if (!response.ok) {
    throw new Error(`Failed to get digest item: ${response.status}`);
  }

  const json = await response.json();

  if ("error" in json) {
    throw new Error(json.error as string);
  }

  return json;
}

/**
 * Create a new list subscription via API
 */
export async function apiCreateList(
  request: Request,
  data: {
    uri: string;
    name: string;
    accountId: string;
    type: "bluesky" | "mastodon";
  }
) {
  const client = createApiClient(request);
  const response = await client.api.lists.$post({
    json: data,
  });

  if (!response.ok) {
    throw new Error(`Failed to create list: ${response.status}`);
  }

  const json = await response.json();

  if ("error" in json) {
    throw new Error(json.error as string);
  }

  return json;
}

/**
 * Delete a list subscription via API
 */
export async function apiDeleteList(
  request: Request,
  data: {
    uri: string;
    accountId: string;
  }
) {
  const client = createApiClient(request);
  const response = await client.api.lists.$delete({
    json: data,
  });

  if (!response.ok) {
    throw new Error(`Failed to delete list: ${response.status}`);
  }

  const json = await response.json();

  if ("error" in json) {
    throw new Error(json.error as string);
  }

  return json;
}

/**
 * Process social media links via API
 */
export async function apiProcessLinks(
  request: Request,
  type?: "bluesky" | "mastodon"
) {
  const client = createApiClient(request);
  const response = await client.api.links.process.$post({
    json: { type },
  });

  if (!response.ok) {
    throw new Error(`Failed to process links: ${response.status}`);
  }

  const json = await response.json();

  if ("error" in json) {
    throw new Error(json.error as string);
  }

  return json;
}

/**
 * Get current (non-canceled) subscription for user via API
 */
export async function apiGetCurrentSubscription(request: Request) {
  const client = createApiClient(request);
  const response = await client.api.subscription.current.$get();

  if (!response.ok) {
    throw new Error(`Failed to get current subscription: ${response.status}`);
  }

  const json = await response.json();

  if ("error" in json) {
    throw new Error(json.error as string);
  }

  return json;
}

/**
 * Get active subscription for user via API
 */
export async function apiGetActiveSubscription(request: Request) {
  const client = createApiClient(request);
  const response = await client.api.subscription.active.$get();

  if (!response.ok) {
    throw new Error(`Failed to get active subscription: ${response.status}`);
  }

  const json = await response.json();

  if ("error" in json) {
    throw new Error(json.error as string);
  }

  return json;
}

/**
 * Get all polar products via API
 */
export async function apiGetPolarProducts(request: Request) {
  const client = createApiClient(request);
  const response = await client.api.subscription.products.$get();

  if (!response.ok) {
    throw new Error(`Failed to get polar products: ${response.status}`);
  }

  const json = await response.json();

  if ("error" in json) {
    throw new Error(json.error as string);
  }

  return json;
}

/**
 * Search for a user by email via API
 */
export async function apiSearchUser(request: Request, email: string) {
  const client = createApiClient(request);
  const response = await client.api.auth["search-user"].$post({
    json: { email },
  });

  if (!response.ok) {
    throw new Error(`Failed to search user: ${response.status}`);
  }

  const json = await response.json();

  if ("error" in json) {
    throw new Error(json.error as string);
  }

  return json;
}

/**
 * Reset user password via API
 */
export async function apiResetPassword(
  request: Request,
  data: { email: string; newPassword: string }
) {
  const client = createApiClient(request);
  const response = await client.api.auth["reset-password"].$post({
    json: data,
  });

  if (!response.ok) {
    throw new Error(`Failed to reset password: ${response.status}`);
  }

  const json = await response.json();

  if ("error" in json) {
    throw new Error(json.error as string);
  }

  return json;
}

/**
 * Initiate email change with verification via API
 */
export async function apiChangeEmail(
  request: Request,
  data: { email: string }
) {
  const client = createApiClient(request);
  const response = await client.api.auth["change-email"].$post({
    json: data,
  });

  if (!response.ok) {
    const errorData = await response.json();
    if ("error" in errorData) {
      throw new Error(errorData.error || "Email change failed");
    }
  }

  return await response.json();
}

/**
 * Update email address via API
 */
export async function apiUpdateEmail(
  request: Request,
  data: { oldEmail: string; newEmail: string }
) {
  const client = createApiClient(request);
  const response = await client.api.auth["update-email"].$put({
    json: data,
  });

  if (!response.ok) {
    const errorData = await response.json();
    if ("error" in errorData) {
      throw new Error(errorData.error || "Email change failed");
    }
  }

  return await response.json();
}

/**
 * Initiate forgotten password process
 */
export async function apiForgotPassword(
  request: Request,
  data: { email: string }
) {
  const client = createApiClient(request);
  const response = await client.api.auth["forgot-password"].$post({
    json: data,
  });

  if (!response.ok) {
    throw new Error(`Failed to initiate forgot password: ${response.status}`);
  }

  const json = await response.json();

  if ("error" in json) {
    throw new Error(json.error as string);
  }

  return json;
}

/**
 * Get OAuth client metadata via API
 */
export async function apiGetClientMetadata(request: Request) {
  const client = createApiClient(request);
  const response = await client.api.auth["client-metadata"].$get();

  if (!response.ok) {
    throw new Error(`Failed to get client metadata: ${response.status}`);
  }

  return await response.json();
}

/**
 * Get OAuth JWKs via API
 */
export async function apiGetJwks(request: Request) {
  const client = createApiClient(request);
  const response = await client.api.auth.jwks.$get();

  if (!response.ok) {
    throw new Error(`Failed to get client metadata: ${response.status}`);
  }

  return await response.json();
}

/**
 * Get Bluesky lists for the authenticated user via API
 */
export async function apiGetBlueskyLists(request: Request) {
  const client = createApiClient(request);
  const response = await client.api.bluesky.lists.$get();

  if (!response.ok) {
    throw new Error(`Failed to get Bluesky lists: ${response.status}`);
  }

  const json = await response.json();

  if ("error" in json) {
    throw new Error(json.error as string);
  }

  return json;
}

/**
 * Check Bluesky OAuth status and trigger re-authorization if needed via API
 */
export async function apiCheckBlueskyStatus(request: Request) {
  const client = createApiClient(request);
  const response = await client.api.bluesky.auth.status.$get();

  if (!response.ok) {
    throw new Error(`Failed to check Bluesky status: ${response.status}`);
  }

  const json = await response.json();

  if ("error" in json) {
    throw new Error(json.error as string);
  }

  return json;
}

/**
 * Get Mastodon lists for the authenticated user via API
 */
export async function apiGetMastodonLists(request: Request) {
  const client = createApiClient(request);
  const response = await client.api.mastodon.lists.$get();

  if (!response.ok) {
    throw new Error(`Failed to get Mastodon lists: ${response.status}`);
  }

  const json = await response.json();

  if ("error" in json) {
    throw new Error(json.error as string);
  }

  return json;
}

/**
 * Get network top ten trending links via API
 */
export async function apiGetNetworkTopTen(request: Request) {
  const client = createApiClient(request);
  const response = await client.api.links.trending.$get();

  if (!response.ok) {
    throw new Error(`Failed to get network top ten: ${response.status}`);
  }

  const json = await response.json();

  if ("error" in json) {
    throw new Error(json.error as string);
  }

  return json;
}

/**
 * Update link metadata via API
 */
export async function apiUpdateLinkMetadata(
  request: Request,
  data: {
    url: string;
    metadata: Partial<Omit<typeof link.$inferSelect, "id" | "url" | "giftUrl">>;
  }
) {
  const client = createApiClient(request);
  const response = await client.api.links.metadata.$post({
    json: data,
  });

  if (!response.ok) {
    throw new Error(`Failed to update link metadata: ${response.status}`);
  }

  const json = await response.json();

  if ("error" in json) {
    throw new Error(json.error as string);
  }

  return json;
}
