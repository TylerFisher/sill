import { redirect } from "react-router";
import { apiCheckBlueskyStatus } from "~/utils/api-client.server";
import type { Route } from "./+types/bluesky.status";

export const loader = async ({ request }: Route.LoaderArgs) => {
	try {
		const result = await apiCheckBlueskyStatus(request);

		// If re-authorization is needed, redirect to the OAuth URL
		if (result.needsAuth && "redirectUrl" in result && result.redirectUrl) {
			return redirect(result.redirectUrl);
		}

		// Return the status result
		return result;
	} catch (error) {
		console.error("Bluesky status check error:", error);
		return {
			status: "error",
			needsAuth: false,
			error:
				error instanceof Error ? error.message : "Failed to check Bluesky status",
		};
	}
};
