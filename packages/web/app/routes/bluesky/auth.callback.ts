import { redirect } from "react-router";
import { apiBlueskyAuthCallback } from "~/utils/api-client.server";
import type { Route } from "./+types/auth.callback";

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url);

	// Check for obvious errors first
	if (url.searchParams.get("error_description") === "Access denied") {
		return redirect("/accounts/onboarding/social?error=denied");
	}

	if (url.searchParams.get("error")) {
		return redirect("/accounts/onboarding/social?error=oauth");
	}

	const callbackData = {
		code: url.searchParams.get("code") as string,
		state: url.searchParams.get("state") as string,
	};

	try {
		const result = await apiBlueskyAuthCallback(request, callbackData);
		const data = await result.json();

		if ("error" in data) {
			// Handle login_required case
			if (data.error === "login_required") {
				//@ts-expect-error: idk about this yet
				return redirect(data.redirectUrl);
			}
			throw new Error(data.error);
		}

		if (data.success) {
			return redirect("/download?service=Bluesky");
		}

		// Handle other errors
		return redirect("/accounts/onboarding/social?error=oauth");
	} catch (error) {
		console.error("Bluesky callback error:", error);

		// Handle specific error codes from API
		if (error instanceof Error) {
			if (error.message.includes("denied")) {
				return redirect("/accounts/onboarding/social?error=denied");
			}
			if (error.message.includes("login_required")) {
				return redirect("/accounts/onboarding/social?error=oauth");
			}
		}

		// Fallback - still redirect to success as the account might have been created
		return redirect("/download?service=Bluesky");
	}
}
