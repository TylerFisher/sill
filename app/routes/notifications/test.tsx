import { requireUserId } from "~/utils/auth.server";
import type { Route } from "./+types/test";
import { redirect } from "react-router";
import { db } from "~/drizzle/db.server";
import { eq } from "drizzle-orm";
import { user } from "~/drizzle/schema.server";
import type { NotificationQuery } from "~/components/forms/NotificationQueryItem";

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
	const query: NotificationQuery = JSON.parse(String(formData.get("query")));
};
