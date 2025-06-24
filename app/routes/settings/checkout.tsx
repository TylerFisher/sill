import { requireUserId } from "~/utils/auth.server";
import type { Route } from "./+types/checkout";
import { db } from "~/drizzle/db.server";
import { subscription } from "~/drizzle/schema.server";
import Layout from "~/components/nav/Layout";
import { Box, DataList, Grid, Heading } from "@radix-ui/themes";
import PageHeading from "~/components/nav/PageHeading";
import { and, eq } from "drizzle-orm";
import FeatureCard from "~/components/subscription/FeatureCard";
import { Bell, Bookmark, List, Mail } from "lucide-react";
import { Await } from "react-router";
import { Suspense } from "react";

const pollForSubscription = async (
	userId: string,
): Promise<{ hasSubscription: boolean }> => {
	const checkSubscription = async (): Promise<boolean> => {
		const userSubscription = await db.query.subscription.findFirst({
			where: and(
				eq(subscription.userId, userId),
				eq(subscription.status, "active"),
			),
		});
		return !!userSubscription;
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

export const loader = async ({ request }: Route.LoaderArgs) => {
	const userId = await requireUserId(request);

	const subscriptionPromise = pollForSubscription(userId);

	return {
		subscriptionResult: subscriptionPromise,
	};
};

const CheckoutContent = () => (
	<>
		<PageHeading
			title="Congratulations!"
			dek="Thank you for signing up for Sill+. Here's what you can expect."
		/>

		<Box mb="6">
			<Heading as="h3" size="4" mb="3">
				Your subscription
			</Heading>
			<DataList.Root>
				<DataList.Item align="center">
					<DataList.Label>Plan</DataList.Label>
					<DataList.Value>Sill+ monthly</DataList.Value>
				</DataList.Item>
			</DataList.Root>
		</Box>

		<Box>
			<Heading as="h3" size="4" mb="4">
				Get started with your new features
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
					benefit="Never miss trending stories again"
					url="/digest"
				/>
				<FeatureCard
					icon={<Bell size={24} />}
					title="Notifications"
					description="Set up personalized email or RSS alerts for any criteria you define, from popularity thresholds to specific keywords."
					benefit="Stay ahead of the conversation"
					url="/notifications"
				/>
				<FeatureCard
					icon={<List size={24} />}
					title="Lists & Feeds"
					description="Track links from your favorite custom lists and feeds on Bluesky or Mastodon."
					benefit="Follow your interests precisely"
					url="/settings/connections"
				/>
				<FeatureCard
					icon={<Bookmark size={24} />}
					title="Bookmarks"
					description="Save links to your bookmarks for easy access and organization."
					benefit="Never lose important stories"
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
