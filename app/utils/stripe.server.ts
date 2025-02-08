import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { uuidv7 } from "uuidv7-js";
import { db } from "~/drizzle/db.server";
import { plan, price, subscription, user } from "~/drizzle/schema.server";

export const stripe = process.env.STRIPE_SECRET_KEY
	? new Stripe(process.env.STRIPE_SECRET_KEY!, {
			apiVersion: "2024-12-18.acacia",
			typescript: true,
		})
	: null;

export const syncStripeDataToDb = async (customerId: string) => {
	const existingUser = await db.query.user.findFirst({
		where: eq(user.customerId, customerId),
		columns: {
			id: true,
		},
	});

	if (!existingUser) {
		return;
	}

	const subscriptions = await stripe.subscriptions.list({
		customer: customerId,
		status: "all",
	});

	if (subscriptions.data.length === 0) {
		return;
	}

	for (const sub of subscriptions.data) {
		const dbPlan = await db.query.plan.findFirst({
			where: eq(plan.stripeId, sub.items.data[0].price.product.toString()),
			columns: {
				id: true,
			},
		});

		const dbPrice = await db.query.price.findFirst({
			where: eq(price.stripeId, sub.items.data[0].price.id),
			columns: {
				id: true,
			},
		});

		if (!dbPlan || !dbPrice) {
			return;
		}

		const subData = {
			userId: existingUser.id,
			planId: dbPlan.id,
			stripeId: sub.id,
			status: sub.status,
			priceId: dbPrice.id,
			periodEnd: new Date(sub.current_period_end * 1000),
			periodStart: new Date(sub.current_period_start * 1000),
			cancelAtPeriodEnd: sub.cancel_at_period_end,
		};

		// Save subscription data to the database.
		await db
			.insert(subscription)
			.values({
				...subData,
				id: uuidv7(),
			})
			.onConflictDoUpdate({
				target: [subscription.stripeId],
				set: subData,
			});
	}
};
