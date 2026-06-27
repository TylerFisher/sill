import { Box, Button, Grid, Heading } from "@radix-ui/themes";
import { Bell, Bookmark, List, Mail } from "lucide-react";
import { Suspense } from "react";
import { Await } from "react-router";
import Layout from "~/components/nav/Layout";
import PageHeading from "~/components/nav/PageHeading";
import FeatureCard from "~/components/subscription/FeatureCard";
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

			<Box mb="6">
				<a href="/settings/subscription">
					<Button size="2" variant="soft">
						Manage your subscription
					</Button>
				</a>
			</Box>

			<Box>
				<Heading as="h3" size="4" mb="3">
					While you're here
				</Heading>
				{/* Sill's features are free for everyone — this is onboarding, not a
				    list of what the subscription unlocked. */}
				<Grid
					columns={{
						initial: "1",
						sm: "2",
					}}
					gap="4"
				>
					<FeatureCard
						icon={<Mail size={24} />}
						title="Daily Digests"
						description="A daily email or RSS roundup of the most shared links in your network, at a time you choose."
						url="/digest"
					/>
					<FeatureCard
						icon={<Bell size={24} />}
						title="Notifications"
						description="Email or RSS alerts for the links you care about, by keyword, popularity, and more."
						url="/notifications"
					/>
					<FeatureCard
						icon={<List size={24} />}
						title="Lists & Feeds"
						description="Follow links from custom lists and feeds on Bluesky and Mastodon."
						url="/settings/connections"
					/>
					<FeatureCard
						icon={<Bookmark size={24} />}
						title="Bookmarks"
						description="Save links to read or come back to later."
						url="/bookmarks"
					/>
				</Grid>
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
