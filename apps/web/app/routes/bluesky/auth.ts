import { redirect } from "react-router";
import { apiBlueskyAuthStart } from "~/utils/api-client.server";
import { setBlueskyModeCookie } from "~/utils/session.server";
import type { Route } from "./+types/auth";

export const loader = async ({ request }: Route.LoaderArgs) => {
  const requestUrl = new URL(request.url);
  const refererHeader = request.headers.get("referer");
  const handle = requestUrl.searchParams.get("handle");
  const mode = requestUrl.searchParams.get("mode") as
    | "login"
    | "signup"
    | undefined;

  // Determine where to redirect on error based on mode and referer
  const getErrorRedirectPath = () => {
    if (mode === "login") return "/accounts/login";
    if (mode === "signup") return "/accounts/signup";
    if (refererHeader) {
      try {
        const refererUrl = new URL(refererHeader);
        return refererUrl.pathname;
      } catch {
        return refererHeader;
      }
    }
    return "/accounts/onboarding/social";
  };

  try {
    const result = await apiBlueskyAuthStart(
      request,
      handle || undefined,
      mode || undefined
    );

    // Set cookie on web app side to persist mode across OAuth redirect
    let headers: Headers | undefined;
    if (mode) {
      headers = await setBlueskyModeCookie(request, mode);
    }

    return redirect(result.redirectUrl, { headers });
  } catch (error) {
    console.error("Bluesky auth error:", error);

    const errorPath = getErrorRedirectPath();
    const errorCode =
      (error as Error & { code?: string }).code ||
      (error instanceof Error && error.message.includes("resolver")
        ? "resolver"
        : "oauth");

    return redirect(`${errorPath}?error=${errorCode}`);
  }
};
