import { Box, Button, Flex, Heading, Separator, Text } from "@radix-ui/themes";
import { Bell, Bookmark, List, Mail } from "lucide-react";
import { Suspense } from "react";
import { Await } from "react-router";
import Layout from "~/components/nav/Layout";
import PageHeading from "~/components/nav/PageHeading";
import FeatureRow from "~/components/subscription/FeatureRow";
import SubscriptionDetailsCard from "~/components/subscription/SubscriptionDetailsCard";
import SubscriptionThanksHeader from "~/components/subscription/SubscriptionThanksHeader";
import type { Route } from "./+types/checkout";
import { requireUserFromContext } from "~/utils/context.server";
import { apiGetActiveSubscription } from "~/utils/api-client.server";

type ActiveSub = NonNullable<
  Awaited<ReturnType<typeof apiGetActiveSubscription>>["subscription"]
>;

// Poll until the webhook has created the active subscription, then hand back the
// full record (with its product) so the page can render the same details card as
// the manage page.
const pollForSubscription = async (request: Request): Promise<ActiveSub> => {
  return new Promise((resolve) => {
    const poll = async () => {
      try {
        const { subscription } = await apiGetActiveSubscription(request);
        if (subscription) {
          resolve(subscription);
          return;
        }
      } catch (error) {
        // Not ready yet (or transient error); keep polling.
      }
      setTimeout(poll, 500);
    };
    poll();
  });
};

export const loader = async ({ request, context }: Route.LoaderArgs) => {
  await requireUserFromContext(context);
  return {
    subscriptionResult: pollForSubscription(request),
  };
};

const CheckoutContent = ({ subscription }: { subscription: ActiveSub }) => {
  // Same conversion the manage page does: the period columns come over the wire
  // as ISO strings, but SubscriptionDetailsCard wants Date objects.
  const sub = {
    ...subscription,
    periodStart: subscription.periodStart
      ? new Date(subscription.periodStart)
      : null,
    periodEnd: subscription.periodEnd ? new Date(subscription.periodEnd) : null,
  };

  return (
    <>
      <SubscriptionThanksHeader iosNote="Check your email for a link to the iOS beta." />

      <SubscriptionDetailsCard subscription={sub} />

      <Box>
        <a href="/settings/subscription">
          <Button size="2" variant="soft">
            Manage your subscription
          </Button>
        </a>
      </Box>

      <Separator size="4" my="6" />

      <Box>
        <Heading as="h3" size="4" mb="1">
          While you're here
        </Heading>
        <Text mb="4" as="p" size="3" color="gray">
          A few things you can do with Sill.
        </Text>
        <Flex direction="column" gap="4">
          <FeatureRow
            to="/digest"
            icon={<Mail size={20} />}
            title="Daily Digests"
            description="A daily email or RSS roundup of the most shared links in your network, at a time you choose."
          />
          <FeatureRow
            to="/notifications"
            icon={<Bell size={20} />}
            title="Notifications"
            description="Email or RSS alerts for the links you care about, by keyword, popularity, and more."
          />
          <FeatureRow
            to="/settings/connections"
            icon={<List size={20} />}
            title="Lists & Feeds"
            description="Follow links from custom lists and feeds on Bluesky and Mastodon."
          />
          <FeatureRow
            to="/bookmarks"
            icon={<Bookmark size={20} />}
            title="Bookmarks"
            description="Save links to read or come back to later."
          />
        </Flex>
      </Box>
    </>
  );
};

const LoadingFallback = () => (
  <PageHeading
    title="Confirming your subscription…"
    dek="This will only take a moment."
  />
);

const Checkout = ({ loaderData }: Route.ComponentProps) => {
  const { subscriptionResult } = loaderData;

  return (
    <Layout>
      <Suspense fallback={<LoadingFallback />}>
        <Await resolve={subscriptionResult}>
          {(subscription) => <CheckoutContent subscription={subscription} />}
        </Await>
      </Suspense>
    </Layout>
  );
};

export default Checkout;
