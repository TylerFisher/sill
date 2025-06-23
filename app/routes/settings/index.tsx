import type { Route } from "./+types/index";
import { invariantResponse } from "@epic-web/invariant";
import { Box, Button, Flex, Heading, Tabs } from "@radix-ui/themes";
import { AlertDialog, DataList } from "@radix-ui/themes";
import { Form, Link, useSearchParams } from "react-router";
import { eq } from "drizzle-orm";
import BlueskyConnectForm from "~/components/forms/BlueskyConnectForm";
import type { ListOption } from "~/components/forms/ListSwitch";
import MastodonConnectForm from "~/components/forms/MastodonConnectForm";
import SubmitButton from "~/components/forms/SubmitButton";
import Layout from "~/components/nav/Layout";
import PageHeading from "~/components/nav/PageHeading";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import { isSubscribed, requireUserId } from "~/utils/auth.server";
import { getBlueskyLists } from "~/utils/bluesky.server";
import { getMastodonLists } from "~/utils/mastodon.server";

export const meta: Route.MetaFunction = () => [{ title: "Sill | Settings" }];

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request);
	const subscribed = await isSubscribed(userId);
	const existingUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
		with: {
			mastodonAccounts: {
				with: {
					lists: true,
					mastodonInstance: true,
				},
			},
			blueskyAccounts: {
				with: {
					lists: true,
				},
			},
		},
	});
	invariantResponse(existingUser, "User not found", { status: 404 });

	const listOptions: ListOption[] = [];

	if (existingUser.blueskyAccounts.length > 0 && subscribed) {
		try {
			listOptions.push(
				...(await getBlueskyLists(existingUser.blueskyAccounts[0])),
			);
		} catch (e) {
			console.error("error getting bluesky lists", e);
		}
	}

	if (existingUser.mastodonAccounts.length > 0 && subscribed !== "free") {
		try {
			listOptions.push(
				...(await getMastodonLists(existingUser.mastodonAccounts[0])),
			);
		} catch (e) {
			console.error("error getting mastodon lists", e);
		}
	}

	return { user: existingUser, subscribed, listOptions };
}

export default function Settings({ loaderData }: Route.ComponentProps) {
	const { user, listOptions, subscribed } = loaderData;
	const [searchParams] = useSearchParams();
	const signedUpOn = new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(new Date(user.createdAt));

	return (
		<Layout>
			<Tabs.Root defaultValue="account">
				<Tabs.List mb="4">
					<Tabs.Trigger value="account">Account</Tabs.Trigger>
					<Tabs.Trigger value="connect">Connections</Tabs.Trigger>
				</Tabs.List>
				<Tabs.Content value="account">
					<Box>
						<Heading as="h2" mb="2">
							Account
						</Heading>
						<DataList.Root>
							<DataList.Item align="center">
								<DataList.Label>Email</DataList.Label>
								<DataList.Value>{user.email}</DataList.Value>
							</DataList.Item>
							<DataList.Item align="center">
								<DataList.Label>Signed up on</DataList.Label>
								<DataList.Value>{signedUpOn}</DataList.Value>
							</DataList.Item>
						</DataList.Root>
						<Heading as="h5" size="4" mt="6" mb="2">
							Account actions
						</Heading>
						<Flex mt="4" gap="4" direction="column">
							<Box width="100%">
								<Form method="get" action="/accounts/logout">
									<SubmitButton
										variant="soft"
										style={{
											width: "100%",
										}}
										label="Log out"
									/>
								</Form>
							</Box>
							<Box>
								<Link to="/accounts/change-email">
									<Button
										variant="soft"
										style={{
											width: "100%",
										}}
									>
										Change your email
									</Button>
								</Link>
							</Box>
							<Box>
								<Link to="/accounts/password">
									<Button
										variant="soft"
										style={{
											width: "100%",
										}}
									>
										Change your password
									</Button>
								</Link>
							</Box>
							<Box>
								<Link to="/settings/subscription">
									<Button
										variant="soft"
										style={{
											width: "100%",
										}}
									>
										{subscribed === "plus"
											? "Manage subscription"
											: "Subscribe to Sill+"}
									</Button>
								</Link>
							</Box>

							<AlertDialog.Root>
								<AlertDialog.Trigger>
									<Button color="red" variant="soft">
										Delete your account
									</Button>
								</AlertDialog.Trigger>
								<AlertDialog.Content>
									<AlertDialog.Description>
										Are you sure you want to delete your account? This action is
										irreversible.
									</AlertDialog.Description>
									<Flex
										gap="3"
										mt="4"
										direction={{
											initial: "column",
											sm: "row",
										}}
									>
										<Box
											width={{
												initial: "100%",
												sm: "auto",
											}}
										>
											<AlertDialog.Cancel>
												<Button variant="soft" color="gray">
													No, keep my account
												</Button>
											</AlertDialog.Cancel>
										</Box>
										<Box
											width={{
												initial: "100%",
												sm: "auto",
											}}
										>
											<AlertDialog.Action>
												<Form method="post" action="/accounts/user/delete">
													<SubmitButton label="Yes, delete my account" />
												</Form>
											</AlertDialog.Action>
										</Box>
									</Flex>
								</AlertDialog.Content>
							</AlertDialog.Root>
						</Flex>
					</Box>
				</Tabs.Content>
				<Tabs.Content value="connect">
					<Box mb="6">
						<PageHeading
							title="Connections"
							dek="Sill connects to your Bluesky and Mastodon accounts and gathers all of the links posted to your timeline. Then, Sill aggregates those links to show you the most popular links in your network. You can connect to one or both of these services."
						/>
					</Box>
					<BlueskyConnectForm
						account={user.blueskyAccounts[0]}
						subscribed={subscribed}
						searchParams={searchParams}
						listOptions={listOptions.filter((l) => l.type === "bluesky")}
					/>
					<MastodonConnectForm
						account={user.mastodonAccounts[0]}
						subscribed={subscribed}
						searchParams={searchParams}
						listOptions={listOptions.filter((l) => l.type === "mastodon")}
					/>
				</Tabs.Content>
			</Tabs.Root>
		</Layout>
	);
}
