import type { Route } from "./+types/delete";
import { data } from "react-router";
import { requireUserId } from "~/utils/auth.server";
import { db } from "~/drizzle/db.server";
import { notificationGroup } from "~/drizzle/schema.server";
import { eq } from "drizzle-orm";

export const action = async ({ request }: Route.ActionArgs) => {
	const userId = await requireUserId(request);

	if (!userId) {
		return data({ result: "Unauthorized" }, { status: 401 });
	}

	const formData = await request.formData();
	const groupId = String(formData.get("groupId"));

	await db.delete(notificationGroup).where(eq(notificationGroup.id, groupId));

	return { result: "success" };
};
