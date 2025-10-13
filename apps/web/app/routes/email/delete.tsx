import { redirect } from "react-router";
import { apiDeleteDigestSettings } from "~/utils/api-client.server";
import { requireUserFromContext } from "~/utils/context.server";
import type { Route } from "./+types/delete";

export const action = async ({ request, context }: Route.ActionArgs) => {
	await requireUserFromContext(context);

	try {
		const response = await apiDeleteDigestSettings(request);

		if (!response.ok) {
			const errorData = await response.json();
			if ("error" in errorData) {
				throw new Error(errorData.error as string);
			}
			throw new Error("Failed to delete settings");
		}

		return redirect("/email");
	} catch (error) {
		// In case of error, still redirect but could handle this better
		console.error("Failed to delete digest settings:", error);
		return redirect("/email");
	}
};
