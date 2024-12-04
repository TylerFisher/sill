import { redirect, type ActionFunctionArgs } from "@remix-run/node";
import { and, eq } from "drizzle-orm";
import { db } from "~/drizzle/db.server";
import { digestSettings } from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";

export const action = async ({ request }: ActionFunctionArgs) => {
	const userId = await requireUserId(request);
	await db.delete(digestSettings).where(and(eq(digestSettings.userId, userId)));

	return redirect("/email");
};
