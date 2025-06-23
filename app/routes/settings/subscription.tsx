import Layout from "~/components/nav/Layout";
import type { Route } from "./+types/subscription";
import { requireUserId } from "~/utils/auth.server";
import { db } from "~/drizzle/db.server";
import { and, eq, not } from "drizzle-orm";
import { subscription, user } from "~/drizzle/schema.server";
import { Box, Button, Flex, Heading } from "@radix-ui/themes";
import { Bell, Bookmark, List, Mail } from "lucide-react";
import { PolarEmbedCheckout } from "@polar-sh/checkout/embed";
import { useEffect } from "react";
import { useTheme } from "../resources/theme-switch";
import SubscriptionDetailsCard from "~/components/subscription/SubscriptionDetailsCard";
import FeatureCard from "~/components/subscription/FeatureCard";
import SubscriptionPricingCard from "~/components/subscription/SubscriptionPricingCard";
import SubscriptionHeader from "~/components/subscription/SubscriptionHeader";

export const meta: Route.MetaFunction = () => [
	{ title: "Sill | Subscription" },
];

export const loader = async ({ request }: Route.LoaderArgs) => {
	const userId = await requireUserId(request);

	const existingUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
	});

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

	return {
		sub,
		products,
		email: existingUser?.email,
		name: existingUser?.name,
	};
};

const SubscriptionPage = ({ loaderData }: Route.ComponentProps) => {
	const { sub, products, email, name } = loaderData;
	const theme = useTheme();

	useEffect(() => {
		PolarEmbedCheckout.init();
	}, []);

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
					<Flex direction="column" gap="4" mb="4">
						<FeatureCard
							icon={<Mail size={24} />}
							title="Daily Digests"
							description="Get a daily curated email or RSS feed of the most popular links from your network, delivered at your preferred time."
							benefit="Never miss trending content again"
							url="https://docs.sill.social/sill-plus/daily-digest"
						/>
						<FeatureCard
							icon={<Bell size={24} />}
							title="Custom Notifications"
							description="Set up personalized email or RSS alerts for any criteria you define, from popularity thresholds to specific keywords."
							benefit="Stay ahead of the conversation"
							url="https://docs.sill.social/sill-plus/notifications"
						/>
						<FeatureCard
							icon={<List size={24} />}
							title="Track Lists & Feeds"
							description="Track links from your favorite custom lists and feeds on Bluesky or Mastodon."
							benefit="Follow your interests precisely"
							url="https://docs.sill.social/sill-plus/lists"
						/>
						<FeatureCard
							icon={<Bookmark size={24} />}
							title="Unlimited Bookmarks"
							description="Save links to your bookmarks for easy access and organization. Sill will continue scanning for posts linking to your bookmarks indefinitely."
							benefit="Never lose track of important content"
							url="https://docs.sill.social/sill-plus/bookmarks"
						/>
					</Flex>

					<SubscriptionPricingCard
						products={products}
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
