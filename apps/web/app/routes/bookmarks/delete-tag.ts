import { apiDeleteBookmarkTag } from "~/utils/api-client.server";
import type { Route } from "./+types/delete-tag";

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData();
	const url = formData.get("url") as string;
	const tagName = formData.get("tagName") as string;

	const response = await apiDeleteBookmarkTag(request, { url, tagName });

	if (!response.ok) {
		return { error: "Failed to delete tag" };
	}

	return { success: true };
}
