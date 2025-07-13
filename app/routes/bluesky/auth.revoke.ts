import { eq } from "drizzle-orm";
import { redirect } from "react-router";
import { db } from "~/drizzle/db.server";
import { blueskyAccount } from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";
import type { Route } from "./+types/auth.revoke";

export const action = async ({ request }: Route.ActionArgs) => {
	const userId = await requireUserId(request);

	if (!userId) {
		throw new Error("User not authenticated.");
	}

	await db.delete(blueskyAccount).where(eq(blueskyAccount.userId, userId));

	return redirect("/settings?tab=connect");
};
