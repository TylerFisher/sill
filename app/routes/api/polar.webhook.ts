import { Webhooks } from "@polar-sh/remix";
import { and, eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7-js";
import { db } from "~/drizzle/db.server";
import { polarProduct, subscription, user } from "~/drizzle/schema.server";
import { conflictUpdateSetAllColumns } from "~/utils/links.server";

export const action = Webhooks({
	webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
	onCustomerStateChanged: async (payload) => {
		console.log("customer state changed", payload);

		if (!payload.data.externalId) {
			console.error("Did not receive external ID from payload");
			return;
		}
		const foundUsers = await db
			.update(user)
			.set({
				customerId: payload.data.id,
			})
			.where(eq(user.id, payload.data.externalId))
			.returning({
				id: user.id,
			});
		if (foundUsers.length === 0) {
			console.error("Could not find user");
			return;
		}

		const dbUser = foundUsers[0];

		const product = await db.query.polarProduct.findFirst({
			where: eq(
				polarProduct.polarId,
				payload.data.activeSubscriptions[0].productId,
			),
		});

		if (!product) {
			console.error("Could not find product");
			return;
		}
		if (payload.data.activeSubscriptions.length === 0) {
			console.error("No active subscriptions");

			// Update lapsed subs
			await db
				.update(subscription)
				.set({
					status: "canceled",
				})
				.where(
					and(
						eq(subscription.userId, dbUser.id),
						eq(subscription.status, "active"),
					),
				);

			return;
		}
		const polarSubscription = payload.data.activeSubscriptions[0];

		await db
			.insert(subscription)
			.values({
				id: uuidv7(),
				userId: dbUser.id,
				polarId: polarSubscription.id,
				polarProductId: product.id,
				periodEnd: polarSubscription.currentPeriodEnd,
				periodStart: polarSubscription.currentPeriodStart,
				cancelAtPeriodEnd: polarSubscription.cancelAtPeriodEnd,
				status: polarSubscription.status || "",
			})
			.onConflictDoUpdate({
				target: subscription.polarId,
				set: {
					...conflictUpdateSetAllColumns(subscription),
				},
			});
	},
});
