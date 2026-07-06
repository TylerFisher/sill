import { Polar } from "@polar-sh/sdk";
import type { Product } from "@polar-sh/sdk/models/components/product";
import { uuidv7 } from "uuidv7-js";
import { db, polarProduct } from "@sill/schema";

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
  server: process.env.POLAR_SERVER === "production" ? "production" : "sandbox",
});

const PRICE_CURRENCIES = ["usd", "eur", "gbp"] as const;

/**
 * Create a pay-what-you-want product: the customer chooses the amount at
 * checkout, with `minimum` (in whole units) as both the floor and the starting
 * value shown. One price is created per supported currency.
 */
export const createProduct = async (
  name: string,
  description: string,
  interval: "month" | "year",
  minimum: number
): Promise<Product> => {
  return await polar.products.create({
    name,
    description,
    recurringInterval: interval,
    prices: PRICE_CURRENCIES.map((priceCurrency) => ({
      amountType: "custom" as const,
      priceCurrency,
      minimumAmount: minimum * 100,
      presetAmount: minimum * 100,
    })),
  });
};

export const createCheckoutLink = async (product: Product) => {
  return await polar.checkoutLinks.create({
    label: `${product.name} Checkout Link`,
    products: [product.id],
    successUrl: `${process.env.VITE_PUBLIC_DOMAIN}/settings/checkout?checkoutId={CHECKOUT_ID}`,
    paymentProcessor: "stripe",
  });
};

export const bootstrapProducts = async () => {
  const description = "Support Sill and get access to the iOS beta.";
  const plans = [
    { name: "Sill+ Monthly", interval: "month" as const, minimum: 4 },
    { name: "Sill+ Yearly", interval: "year" as const, minimum: 40 },
  ];

  for (const plan of plans) {
    const product = await createProduct(
      plan.name,
      description,
      plan.interval,
      plan.minimum
    );
    const checkoutLink = await createCheckoutLink(product);

    await db.insert(polarProduct).values({
      id: uuidv7(),
      name: product.name,
      description: product.description || description,
      amount: plan.minimum * 100,
      currency: "usd",
      polarId: product.id,
      interval: product.recurringInterval || plan.interval,
      checkoutLinkUrl: checkoutLink.url,
    });
  }
};

export const createCheckout = async (
  productId: string,
  email: string,
  userId: string
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
