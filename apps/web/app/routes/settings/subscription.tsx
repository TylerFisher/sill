import { invariantResponse } from "@epic-web/invariant";
import { Box, Button, Flex, Link, Text } from "@radix-ui/themes";
import { Smartphone } from "lucide-react";
import Layout from "~/components/nav/Layout";
import SettingsTabNav from "~/components/settings/SettingsTabNav";
import FeatureRow from "~/components/subscription/FeatureRow";
import SubscriptionDetailsCard from "~/components/subscription/SubscriptionDetailsCard";
import SubscriptionHeader from "~/components/subscription/SubscriptionHeader";
import SubscriptionPricingCard from "~/components/subscription/SubscriptionPricingCard";
import SubscriptionThanksHeader from "~/components/subscription/SubscriptionThanksHeader";
import { createCheckout } from "~/utils/polar.server";
import { useTheme } from "../resources/theme-switch";
import type { Route } from "./+types/subscription";
import { requireUserFromContext } from "~/utils/context.server";
import {
  apiGetCurrentSubscription,
  apiGetPolarProducts,
} from "~/utils/api-client.server";

export const meta: Route.MetaFunction = () => [{ title: "Get Sill+" }];

export const loader = async ({ request, context }: Route.LoaderArgs) => {
  const existingUser = await requireUserFromContext(context);
  invariantResponse(existingUser, "user not found", { status: 404 });

  const userId = existingUser.id;

  const { subscription: rawSub } = await apiGetCurrentSubscription(request);

  // Convert date strings to Date objects if subscription exists. These come from
  // `timestamp()` columns (mode "date"), so the API already serializes them as
  // full ISO strings (UTC, with `Z`) — parse as-is. Appending another `Z` (as the
  // naive `mode:"string"` columns need) would produce an Invalid Date.
  const sub = rawSub
    ? {
        ...rawSub,
        periodStart: rawSub.periodStart ? new Date(rawSub.periodStart) : null,
        periodEnd: rawSub.periodEnd ? new Date(rawSub.periodEnd) : null,
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
  // A subscription set to cancel at period end (or already canceled) gets the
  // "winding down" treatment instead of the thank-you header.
  const canceled =
    !!sub && (sub.cancelAtPeriodEnd || sub.status === "canceled");

  return (
    <Layout>
      <SettingsTabNav />
      {sub ? (
        <div>
          {canceled ? (
            <Box mb="6">
              <Text
                as="p"
                size={{
                  initial: "6",
                  md: "7",
                }}
                weight="bold"
                color="yellow"
              >
                Sorry to see you go.
              </Text>
              <Text
                as="p"
                size="3"
                color="gray"
                style={{ maxWidth: "520px", marginTop: "var(--space-3)" }}
              >
                Your access stays active until the end of your current period.
                You can reactivate any time.
              </Text>
            </Box>
          ) : (
            <SubscriptionThanksHeader />
          )}
          <SubscriptionDetailsCard subscription={sub} />
          <Flex direction="column" gap="3">
            <a href="/settings/portal">
              {canceled ? (
                <Button size="2">Reactivate subscription</Button>
              ) : (
                <Button size="2">Manage subscription</Button>
              )}
            </a>
          </Flex>
        </div>
      ) : (
        <Box style={{ maxWidth: "620px" }}>
          <SubscriptionHeader />
          <Box mb="5">
            <Text as="p" size="2" weight="bold" color="gray" mb="3">
              Supporters get:
            </Text>
            <FeatureRow
              icon={<Smartphone size={20} />}
              title="Early access to the iOS app"
              description="Sill is coming to iOS. Get into the beta before it's public, and a say in where it goes."
            />
          </Box>

          <SubscriptionPricingCard
            checkoutLinks={checkoutLinks}
            email={email}
            name={name}
            theme={theme}
          />
          <Text as="p" color="gray" size="1" mt="4">
            Sill is part of{" "}
            <Link href="https://euphonos.studio">Euphonos LLC</Link>. Sill uses{" "}
            <Link href="https://polar.sh">Polar</Link>, an online reseller and
            Merchant of Record, to process payments. You are eligible for a
            refund if you email tyler@euphonos.studio with a refund request
            within 14 days.
          </Text>
        </Box>
      )}
    </Layout>
  );
};

export default SubscriptionPage;
