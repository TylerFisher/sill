import { eq } from "drizzle-orm";
import { redirect } from "react-router";
import { db } from "~/drizzle/db.server";
import { blueskyAccount } from "~/drizzle/schema.server";
import type { Route } from "./+types/auth.revoke";
import { requireUserFromContext } from "~/utils/context.server";

export const action = async ({ context }: Route.ActionArgs) => {
	const { id: userId } = await requireUserFromContext(context);

	if (!userId) {
		throw new Error("User not authenticated.");
	}

	await db.delete(blueskyAccount).where(eq(blueskyAccount.userId, userId));

	return redirect("/settings?tab=connect");
};
