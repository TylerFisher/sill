import { redirect, type ActionFunctionArgs } from "@remix-run/node";
import { eq } from "drizzle-orm";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";

export const action = async ({ request }: ActionFunctionArgs) => {
	const userId = await requireUserId(request);
	await db.delete(user).where(eq(user.id, userId));
	return redirect("/");
};
