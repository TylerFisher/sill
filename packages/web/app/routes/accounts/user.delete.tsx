import { eq } from "drizzle-orm";
import { redirect } from "react-router";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import type { Route } from "./+types/user.delete";
import { requireUserFromContext } from "~/utils/context.server";

export const action = async ({ context }: Route.ActionArgs) => {
	const { id: userId } = await requireUserFromContext(context);
	await db.delete(user).where(eq(user.id, userId));
	return redirect("/");
};
