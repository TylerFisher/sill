import { Polar } from "@polar-sh/sdk";
import { HTTPClient } from "@polar-sh/sdk/lib/http";

// Pin the API contract so Polar's quarterly releases don't change it under us.
const httpClient = new HTTPClient().addHook("beforeRequest", (req) => {
  req.headers.set("Polar-Version", "2026-04");
  return req;
});

const polar = new Polar({
  httpClient,
  accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
  server: process.env.POLAR_SERVER === "production" ? "production" : "sandbox",
});

export const createCheckout = async (
  productId: string,
  email: string | null | undefined,
  userId: string
) => {
  const session = await polar.checkouts.create({
    products: [productId],
    ...(email && { customerEmail: email }),
    externalCustomerId: userId,
    embedOrigin: process.env.VITE_PUBLIC_DOMAIN,
    successUrl: `${process.env.VITE_PUBLIC_DOMAIN}/settings/checkout`,
  });

  return session;
};
