import { Webhooks } from "@polar-sh/remix";
import { and, eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7-js";
import { db } from "~/drizzle/db.server";
import { subscription, user } from "~/drizzle/schema.server";
import { conflictUpdateSetAllColumns } from "~/utils/links.server";

export const action = Webhooks({
	webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
	onCustomerStateChanged: async (payload) => {
		let foundUsers: { id: string }[] = [];

		// Set Polar customer ID
		if (payload.data.externalId) {
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
			console.log(
				"[POLAR WEBHOOK] No external ID found, falling back to email matching",
			);
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
			console.error(
				"[POLAR WEBHOOK] Neither external ID nor email available in payload",
			);
			return;
		}

		if (foundUsers.length === 0) {
			console.error(
				"[POLAR WEBHOOK] Could not find user via external ID or email",
			);
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
		const sillProducts = await db.query.polarProduct.findMany();
		const polarSubscription = payload.data.activeSubscriptions.find((sub) =>
			sillProducts.some((product) => product.polarId === sub.productId),
		);

		if (!polarSubscription) {
			console.error("[POLAR WEBHOOK] No valid subscription");
			return;
		}

		const chosenProduct = sillProducts.find(
			(product) => product.polarId === polarSubscription.productId,
		);

		if (!chosenProduct) {
			console.error("[POLAR WEBHOOK] Product not found");
			return;
		}

		await db
			.insert(subscription)
			.values({
				id: uuidv7(),
				userId: dbUser.id,
				polarId: polarSubscription.id,
				polarProductId: chosenProduct.id,
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
