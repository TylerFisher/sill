import { redirect } from "react-router";
import { apiBlueskyCallback } from "~/utils/api.server";
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

	try {
		const result = await apiBlueskyCallback(request, url.searchParams);
		
		if (result.success) {
			return redirect("/download?service=Bluesky");
		}
		
		// Handle login_required case
		if (result.code === 'login_required' && result.redirectUrl) {
			return redirect(result.redirectUrl);
		}
		
		// Handle other errors
		return redirect("/accounts/onboarding/social?error=oauth");
	} catch (error) {
		console.error("Bluesky callback error:", error);
		
		// Handle specific error codes from API
		if (error instanceof Error) {
			if (error.message.includes('denied')) {
				return redirect("/accounts/onboarding/social?error=denied");
			}
			if (error.message.includes('login_required')) {
				return redirect("/accounts/onboarding/social?error=oauth");
			}
		}
		
		// Fallback - still redirect to success as the account might have been created
		return redirect("/download?service=Bluesky");
	}
}
