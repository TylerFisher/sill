import { eq } from "drizzle-orm";
import { redirect } from "react-router";
import type { NotificationQuery } from "~/components/forms/NotificationQueryItem";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";
import { evaluateNotifications } from "~/utils/links.server";
import type { Route } from "./+types/test";

export const action = async ({ request }: Route.ActionArgs) => {
	const userId = await requireUserId(request);
	if (!userId) {
		return redirect("/accounts/login") as never;
	}

	const existingUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
	});

	if (!existingUser) {
		return redirect("/accounts/login") as never;
	}

	const formData = await request.formData();
	const queries: NotificationQuery[] = JSON.parse(
		String(formData.get("queries")),
	);
	console.log(queries);

	if (!queries.length) {
		return 0;
	}

	const links = await evaluateNotifications(userId, queries);
	return links.length;
};
