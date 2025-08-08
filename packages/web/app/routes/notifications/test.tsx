import type { NotificationQuery } from "~/components/forms/NotificationQueryItem";
import { evaluateNotifications } from "~/utils/links.server";
import type { Route } from "./+types/test";
import { requireUserFromContext } from "~/utils/context.server";

export const action = async ({ request, context }: Route.ActionArgs) => {
	const existingUser = await requireUserFromContext(context);
	const userId = existingUser.id;

	const formData = await request.formData();
	const queries: NotificationQuery[] = JSON.parse(
		String(formData.get("queries")),
	);

	if (!queries.length) {
		return 0;
	}

	const links = await evaluateNotifications(userId, queries);
	return links.length;
};
