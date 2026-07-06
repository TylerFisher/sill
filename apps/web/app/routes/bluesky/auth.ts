import { redirect } from "react-router";
import {
  apiBlueskyAuthStart,
  apiCreateMobileCode,
  apiExchangeMobileCode,
} from "~/utils/api-client.server";
import { authSessionStorage } from "~/utils/session.server";
import type { Route } from "./+types/auth";

function hasSessionCookie(request: Request): boolean {
  const header = request.headers.get("cookie");
  if (!header) return false;
  return header
    .split(";")
    .some((part) => part.trim().startsWith("sessionId="));
}

/**
 * When the mobile app needs to connect an additional account, the
 * ASWebAuthenticationSession browser doesn't carry the iOS app's session
 * cookie.  The mobile app passes a short-lived code (obtained via
 * POST /api/auth/create-mobile-code) that we exchange server-side for the
 * real sessionId, then inject it into the cookie header before calling the API.
 */
function injectSessionId(request: Request, sessionId: string): Request {
  const headers = new Headers(request.headers);
  const existing = headers.get("cookie") || "";
  headers.set(
    "cookie",
    existing ? `${existing}; sessionId=${sessionId}` : `sessionId=${sessionId}`
  );
  return new Request(request.url, {
    method: request.method,
    headers,
  });
}

export const loader = async ({ request }: Route.LoaderArgs) => {
  const requestUrl = new URL(request.url);
  const refererHeader = request.headers.get("referer");
  const handle = requestUrl.searchParams.get("handle");
  const mode = requestUrl.searchParams.get("mode") as
    | "login"
    | "signup"
    | undefined;
  const mobile = requestUrl.searchParams.get("mobile") === "1";
  const mobileCode = requestUrl.searchParams.get("code");
  const redirectTo = requestUrl.searchParams.get("redirectTo");

  // Extract pathname from referrer, defaulting to settings if not available or just root
  let origin = "/settings?tabs=connect";
  if (refererHeader) {
    try {
      const refererUrl = new URL(refererHeader);
      // Only use the referrer if it has a meaningful path (not just root)
      if (refererUrl.pathname && refererUrl.pathname !== "/") {
        origin = refererUrl.pathname + refererUrl.search;
      }
    } catch {
      // If it's already a path, use it directly
      if (refererHeader.startsWith("/") && refererHeader !== "/") {
        origin = refererHeader;
      }
    }
  }

  // Determine where to redirect on error based on mode and origin
  const getErrorRedirectPath = () => {
    if (mobile && mobileCode) return "sill://callback";
    if (mode === "login") return "/accounts/login";
    if (mode === "signup") return "/accounts/signup";
    return origin;
  };

  // If the mobile app opens the sign-in flow but the user is already signed
  // into Sill in Safari (ASWebAuthenticationSession shares Safari's cookie
  // jar), skip the full Bluesky OAuth round trip and hand a mobile code
  // straight back to the app. `mobileCode` present means the connect flow,
  // which needs the OAuth path below.
  if (mobile && !mobileCode && hasSessionCookie(request)) {
    try {
      // No sessionId arg: the API validates the forwarded session cookie and
      // only mints a code if the web session is genuinely valid.
      const { code } = await apiCreateMobileCode(request);
      return redirect(
        `sill://callback?code=${encodeURIComponent(code)}&isSignup=0`
      );
    } catch (error) {
      // Session turned out invalid/expired — fall through to normal OAuth.
      console.error("Mobile session shortcut failed:", error);
    }
  }

  try {
    // For mobile connect flow, exchange the code for the real sessionId
    // and inject it into the cookie header before calling the API
    let apiRequest = request;
    let mobileSessionId: string | undefined;
    if (mobile && mobileCode) {
      const { sessionId } = await apiExchangeMobileCode(request, mobileCode);
      mobileSessionId = sessionId;
      apiRequest = injectSessionId(request, sessionId);
    }

    const result = await apiBlueskyAuthStart(
      apiRequest,
      handle || undefined,
      mode || undefined
    );

    // Set cookies to persist mode, origin, and mobile flag across OAuth redirect
    const session = await authSessionStorage.getSession(
      request.headers.get("cookie")
    );

    if (mode) {
      session.set("blueskyMode", mode);
      if (origin) {
        session.set("blueskyOrigin", origin);
      }
    } else {
      session.set("blueskyOrigin", origin);
      session.unset("blueskyMode");
    }

    // Carry the post-login return URL through the OAuth round trip (login only).
    if (mode === "login" && redirectTo) {
      session.set("blueskyRedirectTo", redirectTo);
    } else {
      session.unset("blueskyRedirectTo");
    }

    if (mobile) {
      session.set("mobile", true);
    }

    // Store the API sessionId so the callback route can forward it too
    if (mobileSessionId) {
      session.set("apiSessionId", mobileSessionId);
    }

    const headers = new Headers();
    headers.append(
      "Set-Cookie",
      await authSessionStorage.commitSession(session)
    );

    return redirect(result.redirectUrl, { headers });
  } catch (error) {
    console.error("Bluesky auth error:", error);

    const errorPath = getErrorRedirectPath();
    const errorCode =
      (error as Error & { code?: string }).code ||
      (error instanceof Error && error.message.includes("resolver")
        ? "resolver"
        : "oauth");

    const errorUrl = new URL(errorPath, requestUrl.origin);
    errorUrl.searchParams.set("error", errorCode);
    return redirect(errorUrl.pathname + errorUrl.search);
  }
};
