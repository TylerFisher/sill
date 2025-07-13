import { and, eq } from "drizzle-orm";
import { redirect } from "react-router";
import { db } from "~/drizzle/db.server";
import { digestSettings } from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";
import type { Route } from "./+types/delete";

export const action = async ({ request }: Route.ActionArgs) => {
	const userId = await requireUserId(request);
	await db.delete(digestSettings).where(and(eq(digestSettings.userId, userId)));

	return redirect("/email");
};
