import { eq } from "drizzle-orm";
import { data } from "react-router";
import { db } from "~/drizzle/db.server";
import { notificationGroup } from "~/drizzle/schema.server";
import type { Route } from "./+types/delete";
import { requireUserFromContext } from "~/utils/context.server";

export const action = async ({ request, context }: Route.ActionArgs) => {
	const { id: userId } = await requireUserFromContext(context);

	if (!userId) {
		return data({ result: "Unauthorized" }, { status: 401 });
	}

	const formData = await request.formData();
	const groupId = String(formData.get("groupId"));

	await db.delete(notificationGroup).where(eq(notificationGroup.id, groupId));

	return { result: "success" };
};
