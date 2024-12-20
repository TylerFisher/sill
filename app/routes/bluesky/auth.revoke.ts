import type { Route } from "./+types/auth.revoke";
import { redirect } from "react-router";
import { eq } from "drizzle-orm";
import { db } from "~/drizzle/db.server";
import { blueskyAccount } from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";

export const action = async ({ request }: Route.ActionArgs) => {
	const userId = await requireUserId(request);

	if (!userId) {
		throw new Error("User not authenticated.");
	}

	await db.delete(blueskyAccount).where(eq(blueskyAccount.userId, userId));

	return redirect("/connect");
};
