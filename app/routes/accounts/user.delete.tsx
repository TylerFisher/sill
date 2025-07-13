import { eq } from "drizzle-orm";
import { redirect } from "react-router";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";
import type { Route } from "./+types/user.delete";

export const action = async ({ request }: Route.ActionArgs) => {
	const userId = await requireUserId(request);
	await db.delete(user).where(eq(user.id, userId));
	return redirect("/");
};
