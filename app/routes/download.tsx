import type { Route } from "./+types/download";
import {
	Box,
	Button,
	Card,
	Heading,
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

	return { promise, service, existingUser, subscribed };
};

const Download = ({ loaderData }: Route.ComponentProps) => {
	const { promise, service, existingUser, subscribed } = loaderData;

	console.log(existingUser);
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
								{subscribed === "trial" && (
									<Card mb="4">
										<Heading
											as="h3"
											size="8"
											mb="2"
											style={{
												fontWeight: 900,
												fontStyle: "italic",
												color: "var(--accent-11)",
											}}
										>
											sill+
										</Heading>
										<Text as="p" size="3" mb="4">
											You have a free trial of Sill+ until{" "}
											{existingUser.freeTrialEnd?.toLocaleDateString()}. With
											Sill+, you can access the following features:
										</Text>
										<Heading as="h4" size="4" mb="2">
											Daily Digest
										</Heading>
										<Text as="p" size="2" mb="2">
											Receive a daily briefing via email or RSS with the most
											popular links in your network, scheduled at your preferred
											time.
										</Text>
										<NavLink to="/email">
											<Button variant="solid" size="1">
												Setup Daily Digest
											</Button>
										</NavLink>

										<Separator size="4" my="4" />

										<Heading as="h4" size="4" mb="2">
											Custom notifications
										</Heading>
										<Text as="p" size="2" mb="2">
											Receive notifications via email or RSS when links match
											keywords, share counts, domains, and more.
										</Text>
										<NavLink to="/notifications">
											<Button variant="solid" size="1">
												Setup Notifications
											</Button>
										</NavLink>
										<Separator size="4" my="4" />

										<Heading as="h4" size="4" mb="2">
											Connect lists and feeds
										</Heading>
										<Text as="p" size="2" mb="2">
											Have Sill monitor any custom lists or feeds you use.
										</Text>
										<NavLink to="/connect">
											<Button variant="solid" size="1" mb="4">
												Connect lists
											</Button>
										</NavLink>
										<Separator size="4" my="4" />
										<Heading as="h4" size="4" mb="2">
											Subscribe to Sill+
										</Heading>
										<Text as="p" size="2" mb="2">
											Sill+ costs $5/month or $50/year. Subscribe now to keep
											using these features.
										</Text>
										<NavLink to="/settings/subscription">
											<Button variant="solid" size="1" mb="4">
												Subscribe
											</Button>
										</NavLink>
									</Card>
								)}

								<Text as="p" mb="4">
									<NavLink to="/links">
										<Button variant="solid">
											View your most popular links
										</Button>
									</NavLink>
								</Text>
							</Box>
						);
					}}
				</Await>
			</Suspense>
		</Layout>
	);
};

export default Download;
