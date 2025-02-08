import type { Route } from "./+types/checkout";
import { requireUserId } from "~/utils/auth.server";
import { and, eq, isNotNull } from "drizzle-orm";
import { user } from "~/drizzle/schema.server";
import { Await, redirect, useNavigate } from "react-router";
import { db } from "~/drizzle/db.server";
import { syncStripeDataToDb } from "~/utils/stripe.server";

export const meta: Route.MetaFunction = () => [{ title: "Sill | Checkout" }];

export const loader = async ({ request }: Route.LoaderArgs) => {
	const userId = await requireUserId(request);
	const existingUser = await db.query.user.findFirst({
		where: and(eq(user.id, userId), isNotNull(user.customerId)),
	});

	if (!existingUser) {
		return redirect("/accounts/login");
	}

	await syncStripeDataToDb(existingUser.customerId as string);

	return redirect("/settings/subscription");
};
