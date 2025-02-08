import type { Route } from "./+types/user.delete";
import { redirect } from "react-router";
import { eq } from "drizzle-orm";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";
import { stripe } from "~/utils/stripe.server";

export const action = async ({ request }: Route.ActionArgs) => {
	const userId = await requireUserId(request);

	const existingUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
	});

	if (stripe && existingUser?.customerId) {
		const stripeSubs = await stripe.subscriptions.list({
			customer: existingUser.customerId,
			status: "all",
		});

		for (const sub of stripeSubs.data) {
			await stripe.subscriptions.cancel(sub.id);
		}
	}

	await db.delete(user).where(eq(user.id, userId));
	return redirect("/");
};
