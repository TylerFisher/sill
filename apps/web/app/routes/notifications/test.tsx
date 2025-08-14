import type { NotificationQuery } from "~/components/forms/NotificationQueryItem";
import type { Route } from "./+types/test";
import { requireUserFromContext } from "~/utils/context.server";
import { apiTestNotifications } from "~/utils/api-client.server";

export const action = async ({ request, context }: Route.ActionArgs) => {
	await requireUserFromContext(context);

	const formData = await request.formData();
	const queries: NotificationQuery[] = JSON.parse(
		String(formData.get("queries")),
	);

	if (!queries.length) {
		return 0;
	}

	try {
		const result = await apiTestNotifications(request, queries);
		return result.count;
	} catch (error) {
		console.error("Test notifications error:", error);
		return 0;
	}
};
