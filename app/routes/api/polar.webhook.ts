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

		let foundUsers: { id: string }[] = [];

		// Set Polar customer ID
		if (payload.data.externalId) {
			// Primary approach: match by external ID
			foundUsers = await db
				.update(user)
				.set({
					customerId: payload.data.id,
				})
				.where(eq(user.id, payload.data.externalId))
				.returning({
					id: user.id,
				});
		} else if (payload.data.email) {
			// Fallback approach: match by email
			console.log("No external ID found, falling back to email matching");
			foundUsers = await db
				.update(user)
				.set({
					customerId: payload.data.id,
				})
				.where(eq(user.email, payload.data.email))
				.returning({
					id: user.id,
				});
		} else {
			console.error("Neither external ID nor email available in payload");
			return;
		}

		if (foundUsers.length === 0) {
			console.error("Could not find user");
			return;
		}

		const dbUser = foundUsers[0];

		// Update lapsed subs
		if (payload.data.activeSubscriptions.length === 0) {
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
		// Update active subs
		const polarSubscription = payload.data.activeSubscriptions[0];
		const product = await db.query.polarProduct.findFirst({
			where: eq(polarProduct.polarId, polarSubscription.productId),
		});

		if (!product) {
			console.error("Could not find product");
			return;
		}

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
