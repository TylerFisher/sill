import { Box, DataList, Grid, Heading } from "@radix-ui/themes";
import { Bell, Bookmark, List, Mail } from "lucide-react";
import { Suspense } from "react";
import { Await } from "react-router";
import Layout from "~/components/nav/Layout";
import PageHeading from "~/components/nav/PageHeading";
import FeatureCard from "~/components/subscription/FeatureCard";
import type { Route } from "./+types/checkout";
import { requireUserFromContext } from "~/utils/context.server";
import { apiGetActiveSubscription } from "~/utils/api-client.server";

const pollForSubscription = async (
	request: Request,
): Promise<{ hasSubscription: boolean }> => {
	const checkSubscription = async (): Promise<boolean> => {
		try {
			const { subscription } = await apiGetActiveSubscription(request);
			return !!subscription;
		} catch (error) {
			return false;
		}
	};

	return new Promise((resolve) => {
		const poll = async () => {
			const hasSubscription = await checkSubscription();
			if (hasSubscription) {
				resolve({ hasSubscription: true });
			} else {
				setTimeout(poll, 500);
			}
		};
		poll();
	});
};

export const loader = async ({ request, context }: Route.LoaderArgs) => {
	await requireUserFromContext(context);
	const subscriptionPromise = pollForSubscription(request);
	return {
		subscriptionResult: subscriptionPromise,
	};
};

const CheckoutContent = () => (
	<>
		<PageHeading
			title="Thank you for backing Sill"
			dek="Your sill+ support helps keep Sill running and growing. Early access to the iOS app is on the way."
		/>

		<Box mb="6">
			<Heading as="h3" size="4" mb="3">
				Your subscription
			</Heading>
			<DataList.Root>
				<DataList.Item align="center">
					<DataList.Label>Plan</DataList.Label>
					<DataList.Value>sill+ supporter</DataList.Value>
				</DataList.Item>
			</DataList.Root>
		</Box>

		<Box>
			<Heading as="h3" size="4" mb="4">
				Make the most of Sill
			</Heading>
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
					description="Get a daily curated email or RSS feed of the most popular links from your network, delivered at your preferred time."
					url="/digest"
				/>
				<FeatureCard
					icon={<Bell size={24} />}
					title="Notifications"
					description="Set up personalized email or RSS alerts for any criteria you define, from popularity thresholds to specific keywords."
					url="/notifications"
				/>
				<FeatureCard
					icon={<List size={24} />}
					title="Lists & Feeds"
					description="Track links from your favorite custom lists and feeds on Bluesky or Mastodon."
					url="/settings/connections"
				/>
				<FeatureCard
					icon={<Bookmark size={24} />}
					title="Bookmarks"
					description="Save links to your bookmarks for easy access and organization."
					url="/bookmarks"
				/>
			</Grid>
		</Box>
	</>
);

const LoadingFallback = () => (
	<PageHeading
		title="Processing your subscription..."
		dek="Please wait while we confirm your subscription."
	/>
);

const Checkout = ({ loaderData }: Route.ComponentProps) => {
	const { subscriptionResult } = loaderData;

	return (
		<Layout>
			<Suspense fallback={<LoadingFallback />}>
				<Await resolve={subscriptionResult}>{() => <CheckoutContent />}</Await>
			</Suspense>
		</Layout>
	);
};

export default Checkout;
