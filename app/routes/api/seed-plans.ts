import type { Route } from "./+types/seed-plans";
import { plan, price } from "~/drizzle/schema.server";
import { db } from "~/drizzle/db.server";
import { stripe } from "~/utils/stripe.server";
import { uuidv7 } from "uuidv7-js";

export const PLANS = {
	PLUS: "plus",
} as const;

export type Plan = (typeof PLANS)[keyof typeof PLANS];

/**
 * Enumerates billing intervals for subscription plans.
 */
export const INTERVALS = {
	MONTH: "month",
	YEAR: "year",
} as const;

export type Interval = (typeof INTERVALS)[keyof typeof INTERVALS];

/**
 * Enumerates supported currencies for billing.
 */
export const CURRENCIES = {
	DEFAULT: "usd",
	USD: "usd",
	EUR: "eur",
	GBP: "gbp",
	CAD: "cad",
} as const;

export type Currency = (typeof CURRENCIES)[keyof typeof CURRENCIES];

export const PRICING_PLANS = {
	[PLANS.PLUS]: {
		id: PLANS.PLUS,
		name: "Plus",
		description:
			"Access to Daily Digests, custom notifications, lists, and more.",
		prices: {
			[INTERVALS.MONTH]: {
				[CURRENCIES.USD]: 500,
				[CURRENCIES.EUR]: 500,
				[CURRENCIES.GBP]: 500,
				[CURRENCIES.CAD]: 700,
			},
			[INTERVALS.YEAR]: {
				[CURRENCIES.USD]: 5000,
				[CURRENCIES.EUR]: 5000,
				[CURRENCIES.GBP]: 5000,
				[CURRENCIES.CAD]: 7000,
			},
		},
	},
} satisfies PricingPlan;

/**
 * A type helper defining prices for each billing interval and currency.
 */
type PriceInterval<
	I extends Interval = Interval,
	C extends Currency = Currency,
> = {
	[interval in I]: {
		[currency in C]: typeof price.$inferSelect.amount;
	};
};

/**
 * A type helper defining the structure for subscription pricing plans.
 */
type PricingPlan<T extends Plan = Plan> = {
	[key in T]: {
		id: string;
		name: string;
		description: string;
		prices: PriceInterval;
	};
};

export const loader = async ({ request }: Route.LoaderArgs) => {
	const authHeader = request.headers.get("Authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const token = authHeader.split(" ")[1];
	if (token !== process.env.CRON_API_KEY) {
		throw new Response("Forbidden", { status: 403 });
	}

	/**
	 * Stripe Products.
	 */
	const products = await stripe.products.list({
		limit: 3,
	});
	if (products?.data?.filter((product) => product.active).length) {
		console.info("🏃‍♂️ Skipping Stripe products creation and seeding.");
		return new Response("Stripe products already exist.", { status: 200 });
	}

	/**
	 * Create Stripe Products.
	 */

	const seedProducts = Object.values(PRICING_PLANS).map(
		async ({ id, name, description, prices }) => {
			// Format prices to match Stripe's API.
			const pricesByInterval = Object.entries(prices).flatMap(
				([interval, price]) => {
					return Object.entries(price).map(([currency, amount]) => ({
						interval,
						currency,
						amount,
					}));
				},
			);

			// Create Stripe product.
			await stripe.products.create({
				id,
				name,
				description: description || undefined,
				tax_code: "txcd_10103000",
			});

			// Create Stripe price for the current product.
			const stripePrices = await Promise.all(
				pricesByInterval.map((price) => {
					return stripe.prices.create({
						product: id,
						currency: price.currency ?? "usd",
						unit_amount: price.amount ?? 0,
						tax_behavior: "inclusive",
						recurring: {
							interval: (price.interval as Interval) ?? "month",
						},
					});
				}),
			);

			const dbPlan = await db
				.insert(plan)
				.values({
					id: uuidv7(),
					stripeId: id,
					name,
					description,
				})
				.returning({
					id: plan.id,
				});

			await db.insert(price).values(
				stripePrices.map((price) => ({
					id: uuidv7(),
					stripeId: price.id,
					amount: price.unit_amount ?? 0,
					currency: price.currency ?? "usd",
					interval: price.recurring?.interval ?? "month",
					planId: dbPlan[0].id,
				})),
			);

			return {
				product: id,
				prices: stripePrices.map((price) => price.id),
			};
		},
	);

	const seededProducts = await Promise.all(seedProducts);
	console.info("📦 Stripe Products has been successfully created.");

	// Configure Customer Portal.
	await stripe.billingPortal.configurations.create({
		business_profile: {
			headline: "Sill - Customer Portal",
		},
		features: {
			customer_update: {
				enabled: true,
				allowed_updates: ["address", "shipping", "tax_id", "email"],
			},
			invoice_history: { enabled: true },
			payment_method_update: { enabled: true },
			subscription_cancel: { enabled: true },
			subscription_update: {
				enabled: true,
				default_allowed_updates: ["price"],
				proration_behavior: "always_invoice",
				products: seededProducts,
			},
		},
	});

	console.info("👒 Stripe Customer Portal has been successfully configured.");
	console.info(
		"🎉 Visit: https://dashboard.stripe.com/test/products to see your products.",
	);

	return new Response("Stripe products have been successfully seeded.");
};
