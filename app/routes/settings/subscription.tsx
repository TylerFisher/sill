import Layout from "~/components/nav/Layout";
import type { Route } from "./+types/subscription";
import { requireUserId } from "~/utils/auth.server";
import { db } from "~/drizzle/db.server";
import { and, eq, not } from "drizzle-orm";
import { subscription, user } from "~/drizzle/schema.server";
import { Form, redirect } from "react-router";
import SubmitButton from "~/components/forms/SubmitButton";
import {
	Box,
	Button,
	Card,
	DataList,
	Flex,
	Heading,
	Separator,
	Text,
} from "@radix-ui/themes";
import { PolarEmbedCheckout } from "@polar-sh/checkout/embed";
import { useEffect } from "react";
import { useTheme } from "../resources/theme-switch";

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
			<Heading
				as="h2"
				size="8"
				style={{
					fontWeight: 900,
					fontStyle: "italic",
					color: "var(--accent-11)",
				}}
			>
				sill+
			</Heading>
			{sub ? (
				<div>
					<Card mt="4" mb="6">
						<DataList.Root>
							<DataList.Item align="center">
								<DataList.Label>Subscription status</DataList.Label>
								<DataList.Value>
									{sub.cancelAtPeriodEnd
										? "Cancelled"
										: `${sub.status[0].toLocaleUpperCase()}${sub.status.slice(1)}`}
								</DataList.Value>
							</DataList.Item>
							<DataList.Item align="center">
								<DataList.Label>Plan</DataList.Label>
								<DataList.Value>{sub.polarProduct.name}</DataList.Value>
							</DataList.Item>
							<DataList.Item align="center">
								<DataList.Label>Price</DataList.Label>
								<DataList.Value>
									${sub.polarProduct.amount / 100}/{sub.polarProduct.interval}
								</DataList.Value>
							</DataList.Item>
							<DataList.Item align="center">
								<DataList.Label>Subscription started</DataList.Label>
								<DataList.Value>
									{sub.periodStart?.toLocaleDateString()}
								</DataList.Value>
							</DataList.Item>
							<DataList.Item align="center">
								<DataList.Label>
									{sub.cancelAtPeriodEnd
										? "Subscription ends"
										: "Next billing date"}
								</DataList.Label>
								<DataList.Value>
									{sub.periodEnd?.toLocaleDateString()}
								</DataList.Value>
							</DataList.Item>
						</DataList.Root>
					</Card>
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
				<Box mt="4">
					<Text as="p" mb="4">
						Subscribe to Sill+ to get access to exclusive features and support
						the development of Sill. With Sill+, you get access to:
					</Text>
					<Heading as="h4" size="4" mb="2">
						Daily Digests
					</Heading>
					<Text as="p" mb="4">
						Get a daily curated email or RSS feed of the most popular links from
						your network, delivered at your preferred time.
					</Text>
					<Heading as="h4" size="4" mb="2">
						Custom Notifications
					</Heading>
					<Text as="p" mb="4">
						Set up personalized email or RSS alerts for any criteria you define,
						from popularity thresholds to specific keywords.
					</Text>
					<Heading as="h4" size="4" mb="2">
						Custom Lists & Feeds
					</Heading>
					<Text as="p" mb="4">
						Track links from your favorite custom lists and feeds on Bluesky or
						Mastodon.
					</Text>
					<Heading as="h4" size="4" mb="2">
						Bookmarks
					</Heading>
					<Text as="p" mb="4">
						Save links to your bookmarks for easy access and organization. Sill
						will continue scanning for posts linking to your bookmarks
						indefinitely.
					</Text>
					<Separator my="6" size="4" />
					<Heading as="h3" size="5" mb="4" align="center">
						Subscribe now
					</Heading>
					<Flex gap="3" flexBasis="1" align="center" justify="center">
						{products.map((product) => (
							<a
								data-polar-checkout
								data-polar-checkout-theme={theme}
								href={`${product.checkoutLinkUrl}?customer_email=${email}&customer_name=${name}`}
								key={product.id}
							>
								<Button size="4">
									${product.amount / 100}/{product.interval}
								</Button>
							</a>
						))}
					</Flex>
				</Box>
			)}
		</Layout>
	);
};

export default SubscriptionPage;
