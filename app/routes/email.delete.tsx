import { redirect, type ActionFunctionArgs } from "@remix-run/node";
import { and, eq } from "drizzle-orm";
import { db } from "~/drizzle/db.server";
import { emailSettings } from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";

export const action = async ({ request }: ActionFunctionArgs) => {
	const userId = await requireUserId(request);
	await db.delete(emailSettings).where(and(eq(emailSettings.userId, userId)));

	return redirect("/connect");
};
