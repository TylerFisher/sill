import Layout from "~/components/nav/Layout";
import type { Route } from "./+types/subscription";
import { requireUserId } from "~/utils/auth.server";
import { db } from "~/drizzle/db.server";
import { and, eq, not } from "drizzle-orm";
import { plan, subscription, user } from "~/drizzle/schema.server";
import { Form, redirect } from "react-router";
import SubmitButton from "~/components/forms/SubmitButton";
import { stripe } from "~/utils/stripe.server";
import type Stripe from "stripe";
import {
	Box,
	Card,
	DataList,
	Flex,
	Heading,
	RadioCards,
	Text,
} from "@radix-ui/themes";

export const meta: Route.MetaFunction = () => [
	{ title: "Sill | Subscription" },
];

export const loader = async ({ request }: Route.LoaderArgs) => {
	const userId = await requireUserId(request);

	const sub = await db.query.subscription.findFirst({
		where: and(
			eq(subscription.userId, userId),
			not(eq(subscription.status, "canceled")),
		),
		with: {
			plan: true,
			price: true,
		},
	});

	let stripeSub: Stripe.Response<Stripe.Subscription> | null = null;

	if (sub) {
		stripeSub = await stripe.subscriptions.retrieve(sub.stripeId, {
			expand: ["default_payment_method"],
		});
	}

	return { sub, stripeSub };
};

export const action = async ({ request }: Route.ActionArgs) => {
	const userId = await requireUserId(request);

	const existingUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
	});

	if (!existingUser) {
		return new Response(null);
	}

	const formData = await request.formData();
	const intent = formData.get("intent");

	let customerId = existingUser.customerId;

	if (intent === "update") {
		const session = await stripe.billingPortal.sessions.create({
			customer: customerId as string,
			return_url: "http://localhost:3000/settings/checkout",
			flow_data: {
				type: "payment_method_update",
				after_completion: {
					type: "redirect",
					redirect: {
						return_url: "http://localhost:3000/settings/checkout",
					},
				},
			},
		});
		if (!session.url) return { success: false };
		return redirect(session.url);
	}

	if (intent === "cancel") {
		const subscriptionId = String(formData.get("subscriptionId"));

		const session = await stripe.billingPortal.sessions.create({
			customer: customerId as string,
			return_url: "http://localhost:3000/settings/checkout",
			flow_data: {
				type: "subscription_cancel",
				subscription_cancel: {
					subscription: subscriptionId,
				},
				after_completion: {
					type: "redirect",
					redirect: {
						return_url: "http://localhost:3000/settings/checkout",
					},
				},
			},
		});
		if (!session.url) return { success: false };
		return redirect(session.url);
	}

	if (intent === "switch") {
		const subscriptionId = String(formData.get("subscriptionId"));

		const session = await stripe.billingPortal.sessions.create({
			customer: customerId as string,
			return_url: "http://localhost:3000/settings/checkout",
			flow_data: {
				type: "subscription_update",
				subscription_update: {
					subscription: subscriptionId,
				},
				after_completion: {
					type: "redirect",
					redirect: {
						return_url: "http://localhost:3000/settings/checkout",
					},
				},
			},
		});
		if (!session.url) return { success: false };
		return redirect(session.url);
	}

	if (intent === "reactivate") {
		const session = await stripe.billingPortal.sessions.create({
			customer: customerId as string,
			return_url: "http://localhost:3000/settings/checkout",
		});
		if (!session.url) return { success: false };
		return redirect(session.url);
	}

	if (!customerId) {
		const customerData: Stripe.CustomerCreateParams = {
			email: existingUser.email,
			metadata: {
				userId: existingUser.id,
			},
		};
		if (existingUser.name) {
			customerData.name = existingUser.name;
		}
		const newCustomer = await stripe.customers.create(customerData);

		await db
			.update(user)
			.set({
				customerId: newCustomer.id,
			})
			.where(eq(user.id, existingUser.id));

		customerId = newCustomer.id;
	}

	const plusPlan = await db.query.plan.findFirst({
		where: eq(plan.stripeId, "plus"),
		with: {
			prices: true,
		},
	});

	const interval = String(formData.get("interval"));
	const price = plusPlan?.prices.find(
		(price) => price.interval === interval && price.currency === "usd",
	);

	if (!price) {
		return new Response(null);
	}

	const checkout = await stripe.checkout.sessions.create({
		customer: customerId,
		line_items: [{ price: price.stripeId, quantity: 1 }],
		success_url: "http://localhost:3000/settings/checkout",
		mode: "subscription",
		payment_method_types: ["card", "link"],
	});

	if (!checkout.url) {
		return new Response(null);
	}
	return redirect(checkout.url);
};

const SubscriptionPage = ({ loaderData }: Route.ComponentProps) => {
	const { sub, stripeSub } = loaderData;
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
					<Card mb="6">
						<DataList.Root>
							<DataList.Item align="center">
								<DataList.Label>Subscription status</DataList.Label>
								<DataList.Value>{`${sub.status[0].toLocaleUpperCase()}${sub.status.slice(1)}`}</DataList.Value>
							</DataList.Item>
							<DataList.Item align="center">
								<DataList.Label>Plan</DataList.Label>
								<DataList.Value>{sub.plan.name}</DataList.Value>
							</DataList.Item>
							<DataList.Item align="center">
								<DataList.Label>Price</DataList.Label>
								<DataList.Value>
									${sub.price.amount / 100}/{sub.price.interval}
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
							{stripeSub?.default_payment_method &&
								typeof stripeSub?.default_payment_method === "object" && (
									<DataList.Item align="center">
										<DataList.Label>Payment method</DataList.Label>
										<DataList.Value>
											{stripeSub?.default_payment_method?.card?.brand.toUpperCase()}{" "}
											{stripeSub?.default_payment_method?.card?.last4}
										</DataList.Value>
									</DataList.Item>
								)}
						</DataList.Root>
					</Card>
					<Form method="POST">
						<input type="hidden" name="subscriptionId" value={sub.stripeId} />
						<Flex direction="column" gap="3">
							{sub.cancelAtPeriodEnd || sub.status === "canceled" ? (
								<SubmitButton
									label="Reactivate subscription"
									name="intent"
									value="reactivate"
									variant="soft"
								/>
							) : (
								<>
									<SubmitButton
										label={`Switch to ${sub.price.interval === "year" ? "monthly" : "annual"} billing`}
										name="intent"
										value="switch"
										variant="soft"
									/>
									<SubmitButton
										label="Update payment method"
										name="intent"
										value="Update"
										variant="soft"
									/>
									<SubmitButton
										label="Cancel subscription"
										name="intent"
										value="cancel"
										color="red"
										variant="soft"
									/>
								</>
							)}
						</Flex>
					</Form>
				</div>
			) : (
				<Box mt="4">
					<Text as="p" mb="4">
						Subscribe to Sill+ to get access to exclusive features and support
						the development of Sill. With Sill+, you get access to:
					</Text>
					<Heading as="h4" size="3" mb="2">
						Daily Digest
					</Heading>
					<Text as="p" mb="4">
						Get a daily curated email or RSS feed of the most popular links from
						your network, delivered at your preferred time.
					</Text>
					<Heading as="h4" size="3" mb="2">
						Custom Notifications
					</Heading>
					<Text as="p" mb="4">
						Set up personalized email or RSS alerts for any criteria you define,
						from popularity thresholds to specific keywords.
					</Text>
					<Heading as="h4" size="3" mb="2">
						Custom Lists & Feeds
					</Heading>
					<Text as="p" mb="4">
						Track links from your favorite custom lists and feeds on Bluesky or
						Mastodon.
					</Text>

					<Heading as="h3" size="4" mb="2">
						Subscribe now
					</Heading>
					<Form method="POST">
						<RadioCards.Root
							name="interval"
							defaultValue="month"
							size="1"
							my="3"
						>
							<RadioCards.Item value="month">
								<Flex direction="column" gap="1">
									<Text weight="bold">Monthly</Text>
									<Text>$5/month</Text>
								</Flex>
							</RadioCards.Item>
							<RadioCards.Item value="year">
								<Flex direction="column" gap="1">
									<Text weight="bold">Annual</Text>
									<Text>$50/year</Text>
								</Flex>
							</RadioCards.Item>
						</RadioCards.Root>
						<Flex direction="column" gap="3">
							<SubmitButton label="Subscribe" name="intent" value="subscribe" />
						</Flex>
					</Form>
				</Box>
			)}
		</Layout>
	);
};

export default SubscriptionPage;
