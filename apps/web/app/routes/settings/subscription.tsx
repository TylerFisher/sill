import { invariantResponse } from "@epic-web/invariant";
import { Box, Button, Flex, Grid } from "@radix-ui/themes";
import { HandCoins, Heart, Smartphone, Sparkles } from "lucide-react";
import Layout from "~/components/nav/Layout";
import FeatureCard from "~/components/subscription/FeatureCard";
import SubscriptionDetailsCard from "~/components/subscription/SubscriptionDetailsCard";
import SubscriptionHeader from "~/components/subscription/SubscriptionHeader";
import SubscriptionPricingCard from "~/components/subscription/SubscriptionPricingCard";
import { createCheckout } from "~/utils/polar.server";
import { useTheme } from "../resources/theme-switch";
import type { Route } from "./+types/subscription";
import { requireUserFromContext } from "~/utils/context.server";
import {
  apiGetCurrentSubscription,
  apiGetPolarProducts,
} from "~/utils/api-client.server";

export const meta: Route.MetaFunction = () => [
  { title: "Sill | Subscription" },
];

export const loader = async ({ request, context }: Route.LoaderArgs) => {
  const existingUser = await requireUserFromContext(context);
  invariantResponse(existingUser, "user not found", { status: 404 });

  const userId = existingUser.id;

  const { subscription: rawSub } = await apiGetCurrentSubscription(request);

  // Convert date strings to Date objects if subscription exists
  const sub = rawSub
    ? {
        ...rawSub,
        periodStart: rawSub.periodStart
          ? new Date(`${rawSub.periodStart}Z`)
          : null,
        periodEnd: rawSub.periodEnd ? new Date(`${rawSub.periodEnd}Z`) : null,
      }
    : null;

  const { products } = await apiGetPolarProducts(request);

  const checkoutLinks = await Promise.all(
    products.map(
      async (product) =>
        await createCheckout(product.polarId, existingUser?.email, userId)
    )
  );

  return {
    sub,
    checkoutLinks,
    email: existingUser?.email,
    name: existingUser?.name,
  };
};

const SubscriptionPage = ({ loaderData }: Route.ComponentProps) => {
  const { sub, checkoutLinks, email, name } = loaderData;
  const theme = useTheme();

  return (
    <Layout>
      {sub ? (
        <div>
          <SubscriptionDetailsCard subscription={sub} />
          <Flex direction="column" gap="3">
            <a href="/settings/portal">
              {sub.cancelAtPeriodEnd || sub.status === "canceled" ? (
                <Button size="2">Reactivate subscription</Button>
              ) : (
                <Button size="2">Manage subscription</Button>
              )}
            </a>
          </Flex>
        </div>
      ) : (
        <Box>
          <SubscriptionHeader />
          <Grid
            columns={{
              initial: "1",
              sm: "2",
            }}
            gap="4"
            mb="4"
          >
            <FeatureCard
              icon={<Smartphone size={24} />}
              title="Early access to iOS"
              description="Get the Sill iPhone app before it goes public and help steer where it heads."
            />
            <FeatureCard
              icon={<Heart size={24} />}
              title="Support the work"
              description="Your support pays for the servers and the development time that keep Sill running and improving."
            />
          </Grid>

          <SubscriptionPricingCard
            checkoutLinks={checkoutLinks}
            email={email}
            name={name}
            theme={theme}
          />
        </Box>
      )}
    </Layout>
  );
};

export default SubscriptionPage;
