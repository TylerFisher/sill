import { eq } from "drizzle-orm";
import { data } from "react-router";
import { db } from "~/drizzle/db.server";
import { notificationGroup } from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";
import type { Route } from "./+types/delete";

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
