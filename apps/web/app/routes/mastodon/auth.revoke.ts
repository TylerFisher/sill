import { redirect } from "react-router";
import { apiMastodonRevoke } from "~/utils/api-client.server";
import type { Route } from "./+types/auth.revoke";

export const action = async ({ request }: Route.ActionArgs) => {
	try {
		const response = await apiMastodonRevoke(request);
		const result = await response.json();

		if ("error" in result) {
			throw new Error(result.error);
		}

		if (result.success) {
			return redirect("/settings/connections");
		}

		// Handle specific error cases
		return { message: result.message || "Failed to revoke Mastodon account" };
	} catch (error) {
		console.error("Mastodon revoke error:", error);

		// Handle specific error codes from API
		if (error instanceof Error) {
			if (error.message.includes("Not authenticated")) {
				return redirect("/accounts/login?redirectTo=/settings");
			}
			if (error.message.includes("not found")) {
				return { message: "No Mastodon account to revoke." };
			}
		}

		// Generic error fallback
		return { message: "Failed to revoke Mastodon account. Please try again." };
	}
};
