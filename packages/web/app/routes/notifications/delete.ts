import { data } from "react-router";
import type { Route } from "./+types/delete";
import { requireUserFromContext } from "~/utils/context.server";
import { apiDeleteNotificationGroup } from "~/utils/api-client.server";

export const action = async ({ request, context }: Route.ActionArgs) => {
	const { id: userId } = await requireUserFromContext(context);

	if (!userId) {
		return data({ result: "Unauthorized" }, { status: 401 });
	}

	const formData = await request.formData();
	const groupId = String(formData.get("groupId"));

	try {
		await apiDeleteNotificationGroup(request, groupId);
		return { result: "success" };
	} catch (error) {
		console.error("Delete notification group error:", error);
		return data({ result: "Error deleting notification group" }, { status: 500 });
	}
};
