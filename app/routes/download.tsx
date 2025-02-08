import type { Route } from "./+types/download";
import {
	Box,
	Button,
	Card,
	Heading,
	Link,
	Separator,
	Spinner,
	Text,
} from "@radix-ui/themes";
import { Await, NavLink, redirect } from "react-router";
import { Suspense } from "react";
import Layout from "~/components/nav/Layout";
import { isSubscribed, requireUserId } from "~/utils/auth.server";
import { filterLinkOccurrences } from "~/utils/links.server";
import { eq } from "drizzle-orm";
import { user } from "~/drizzle/schema.server";
import { db } from "~/drizzle/db.server";

export const meta: Route.MetaFunction = () => [{ title: "Sill | Downloading" }];

export const loader = async ({ request }: Route.LoaderArgs) => {
	const userId = await requireUserId(request);
	const existingUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
		with: {
			subscriptions: true,
			blueskyAccounts: true,
			mastodonAccounts: true,
		},
	});

	if (!existingUser) {
		return redirect("/accounts/login") as never;
	}

	const subscribed = await isSubscribed(userId);
	const params = new URL(request.url).searchParams;
	const service = params.get("service");

	const promise = filterLinkOccurrences({ userId, fetch: true })
		.then(() => ({ promise: "success" }))
		.catch(() => ({ promise: "error" }));

	return { promise, service };
};

const Download = ({ loaderData }: Route.ComponentProps) => {
	const { promise, service } = loaderData;

	return (
		<Layout hideNav>
			<Suspense
				fallback={
					<Box>
						<Text as="p" mb="4">
							Downloading the last 24 hours from your {service} timeline. This
							may take a minute.
						</Text>
						<Spinner size="3" />
					</Box>
				}
			>
				<Await
					resolve={promise}
					errorElement={
						<Box>
							<Text as="p" mb="4">
								Failed to download your timeline. Please refresh the page to try
								again.
							</Text>
						</Box>
					}
				>
					{() => {
						return (
							<Box>
								<Heading as="h2" mb="2" size="7">
									Congratulations!
								</Heading>
								<Text as="p" mb="4">
									Your timeline was downloaded, and you are ready to use Sill.
								</Text>

								<Card my="5">
									<Heading as="h4" size="4" mb="2">
										Your links
									</Heading>
									<Text as="p" size="2" mb="2">
										See what's trending across your network in real-time.
									</Text>
									<Link asChild size="2">
										<NavLink to="/links">
											View your most popular links →
										</NavLink>
									</Link>
								</Card>
								<Card my="5">
									<Heading as="h4" size="4" mb="2">
										Connect
									</Heading>
									<Text as="p" size="2" mb="2">
										Connect your Bluesky and Mastodon accounts, plus any lists
										or feeds you subscribe to.
									</Text>
									<Link asChild size="2">
										<NavLink to="/connect">
											Connect more accounts and lists →
										</NavLink>
									</Link>
								</Card>
								<Card my="5">
									<Heading as="h4" size="4" mb="2">
										Daily Digest
									</Heading>
									<Text as="p" size="2" mb="2">
										Get a daily curated email or RSS feed of the most popular
										links from your network, delivered at your preferred time.
									</Text>
									<Link asChild size="2">
										<NavLink to="/email">Setup Daily Digest →</NavLink>
									</Link>
								</Card>

								<Card my="5">
									<Heading as="h4" size="4" mb="2">
										Custom notifications
									</Heading>
									<Text as="p" size="2" mb="2">
										Set up personalized email or RSS alerts for any criteria you
										define, from popularity thresholds to specific keywords.
									</Text>
									<Link asChild size="2">
										<NavLink to="/notifications">Setup notifications →</NavLink>
									</Link>
								</Card>
							</Box>
						);
					}}
				</Await>
			</Suspense>
		</Layout>
	);
};

export default Download;
