import { redirect } from "react-router";
import { apiDeleteBookmark } from "~/utils/api-client.server";
import type { Route } from "./+types/delete";
import { requireUserFromContext } from "~/utils/context.server";

export const action = async ({ request, context }: Route.ActionArgs) => {
	const { id: userId } = await requireUserFromContext(context);

	if (!userId) {
		return redirect("/login");
	}

	const formData = await request.formData();
	const url = String(formData.get("url"));

	if (!url) {
		return redirect("/bookmarks");
	}

	try {
		const response = await apiDeleteBookmark(request, { url });
		
		if (!response.ok) {
			const errorData = await response.json();
			if ("error" in errorData) {
				throw new Error(errorData.error);
			}
		}

		return { success: true };
	} catch (error) {
		console.error("Delete bookmark error:", error);
		return redirect("/bookmarks");
	}
};
