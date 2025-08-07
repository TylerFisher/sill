import { invariantResponse } from "@epic-web/invariant";
import { Box, Button, Flex, Grid, Heading } from "@radix-ui/themes";
import { and, eq, not } from "drizzle-orm";
import { Bell, Bookmark, List, Mail } from "lucide-react";
import Layout from "~/components/nav/Layout";
import FeatureCard from "~/components/subscription/FeatureCard";
import SubscriptionDetailsCard from "~/components/subscription/SubscriptionDetailsCard";
import SubscriptionHeader from "~/components/subscription/SubscriptionHeader";
import SubscriptionPricingCard from "~/components/subscription/SubscriptionPricingCard";
import { db } from "~/drizzle/db.server";
import { subscription, user } from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";
import { createCheckout } from "~/utils/polar.server";
import { useTheme } from "../resources/theme-switch";
import type { Route } from "./+types/subscription";

export const meta: Route.MetaFunction = () => [
	{ title: "Sill | Subscription" },
];

export const loader = async ({ request }: Route.LoaderArgs) => {
	const userId = await requireUserId(request);

	const existingUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
	});
	invariantResponse(existingUser, "user not found", { status: 404 });

	const sub = await db.query.subscription.findFirst({
		where: and(
			eq(subscription.userId, userId),
			not(eq(subscription.status, "canceled")),
		),
		with: {
			polarProduct: true,
		},
	});

	const products = await db.query.polarProduct.findMany();
	const checkoutLinks = await Promise.all(
		products.map(
			async (product) =>
				await createCheckout(product.polarId, existingUser?.email, userId),
		),
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
							icon={<Mail size={24} />}
							title="Daily Digests"
							description="Get a daily curated email or RSS feed of the most popular links from your network, delivered at your preferred time."
							benefit="Never miss trending stories again"
							url="https://docs.sill.social/sill-plus/daily-digest"
						/>
						<FeatureCard
							icon={<Bell size={24} />}
							title="Notifications"
							description="Set up personalized email or RSS alerts for any criteria you define, from popularity thresholds to specific keywords."
							benefit="Stay ahead of the conversation"
							url="https://docs.sill.social/sill-plus/notifications"
						/>
						<FeatureCard
							icon={<List size={24} />}
							title="Lists & Feeds"
							description="Track links from your favorite custom lists and feeds on Bluesky or Mastodon."
							benefit="Follow your interests precisely"
							url="https://docs.sill.social/sill-plus/lists"
						/>
						<FeatureCard
							icon={<Bookmark size={24} />}
							title="Bookmarks"
							description="Save links to your bookmarks for easy access and organization."
							benefit="Never lose important stories"
							url="https://docs.sill.social/sill-plus/bookmarks"
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
