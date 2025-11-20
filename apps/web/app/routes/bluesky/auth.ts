import { redirect } from "react-router";
import { apiBlueskyAuthStart } from "~/utils/api-client.server";
import type { Route } from "./+types/auth";

export const loader = async ({ request }: Route.LoaderArgs) => {
  const requestUrl = new URL(request.url);
  const referrer =
    request.headers.get("referer") || "/accounts/onboarding/social";
  const handle = requestUrl.searchParams.get("handle");

  try {
    const result = await apiBlueskyAuthStart(request, handle || undefined);
    return redirect(result.redirectUrl);
  } catch (error) {
    console.error("Bluesky auth error:", error);

    // Handle specific error codes
    if (error instanceof Error && error.message.includes("resolver")) {
      const errorUrl = new URL(referrer);
      errorUrl.searchParams.set("error", "resolver");
      return redirect(errorUrl.toString());
    }

    // Generic error fallback
    const errorUrl = new URL(referrer);
    errorUrl.searchParams.set("error", "oauth");
    return redirect(errorUrl.toString());
  }
};
