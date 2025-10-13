import { Polar } from "@polar-sh/sdk";

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
  server: "sandbox",
});

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
