import { redirect } from "react-router";
import { apiAddBookmark } from "~/utils/api-client.server";
import type { Route } from "./+types/add";
import { requireUserFromContext } from "~/utils/context.server";

export const action = async ({ request, context }: Route.ActionArgs) => {
	const { id: userId } = await requireUserFromContext(context);

	if (!userId) {
		return redirect("/login");
	}

	const formData = await request.formData();
	const url = String(formData.get("url"));
	const tags = formData.get("tags") ? String(formData.get("tags")) : undefined;
	const publishToAtproto = formData.get("publishToAtproto") === "true";

	if (!url) {
		return redirect("/bookmarks");
	}

	try {
		const response = await apiAddBookmark(request, { url, tags, publishToAtproto });
		
		if (!response.ok) {
			const errorData = await response.json();
			if ("error" in errorData) {
				throw new Error(errorData.error);
			}
		}

		return { success: true };
	} catch (error) {
		console.error("Add bookmark error:", error);
		return redirect("/bookmarks");
	}
};
