import { Polar } from "@polar-sh/sdk";
import type { Product } from "@polar-sh/sdk/models/components/product.js";
import type { ProductPriceFixed } from "@polar-sh/sdk/models/components/productpricefixed.js";
import { uuidv7 } from "uuidv7-js";
import { db } from "../database/db.server.js";
import { polarProduct } from "../database/schema.server.js";

const polar = new Polar({
	accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
	server: "sandbox",
});

export const createProduct = async (
	name: string,
	description: string,
	interval: "month" | "year",
	price: number,
): Promise<Product & { prices: ProductPriceFixed[] }> => {
	const product = await polar.products.create({
		name,
		description,
		recurringInterval: interval,
		prices: [
			{
				amountType: "fixed",
				priceAmount: price * 100,
				priceCurrency: "usd",
			},
		],
	});

	return product as Product & { prices: ProductPriceFixed[] };
};

export const createCheckoutLink = async (product: Product) => {
	return await polar.checkoutLinks.create({
		label: `${product.name} Checkout Link`,
		products: [product.id],
		successUrl: `${process.env.VITE_PUBLIC_DOMAIN}/settings/checkout?checkoutId={CHECKOUT_ID}`,
	});
};

export const bootstrapProducts = async () => {
	const month = await createProduct("Sill+ Monthly", "description", "month", 5);
	const year = await createProduct("Sill+ Yearly", "description", "year", 50);

	for (const product of [month, year]) {
		const checkoutLink = await createCheckoutLink(product);

		await db.insert(polarProduct).values({
			id: uuidv7(),
			name: product.name,
			description: product.description || "",
			amount: product.prices[0].priceAmount,
			currency: product.prices[0].priceCurrency,
			polarId: product.id,
			interval: product.recurringInterval || "monthly",
			checkoutLinkUrl: checkoutLink.url,
		});
	}
};

export const createCheckout = async (
	productId: string,
	email: string,
	userId: string,
) => {
	const session = await polar.checkouts.create({
		products: [productId],
		customerEmail: email,
		externalCustomerId: userId,
		embedOrigin: process.env.VITE_PUBLIC_DOMAIN,
		successUrl: `${process.env.VITE_PUBLIC_DOMAIN}/settings/checkout`,
	});

	return session;
};

export const getCheckout = async (checkoutId: string) => {
	return await polar.checkouts.get({ id: checkoutId });
};

export const getSubscription = async (subscriptionId: string) => {
	return await polar.subscriptions.get({ id: subscriptionId });
};