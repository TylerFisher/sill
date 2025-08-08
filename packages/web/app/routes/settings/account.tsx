import { invariantResponse } from "@epic-web/invariant";
import {
	AlertDialog,
	Box,
	Button,
	DataList,
	Flex,
	Heading,
	Text,
} from "@radix-ui/themes";
import { Form, Link } from "react-router";
import SubmitButton from "~/components/forms/SubmitButton";
import Layout from "~/components/nav/Layout";
import SettingsTabNav from "~/components/settings/SettingsTabNav";
import { apiGetUserProfile } from "~/utils/api.server";
import type { Route } from "./+types/account";

export const meta: Route.MetaFunction = () => [
	{ title: "Sill | Account Settings" },
];

export async function loader({ request }: Route.LoaderArgs) {
	const existingUser = await apiGetUserProfile(request);
	invariantResponse(existingUser, "User not found", { status: 404 });

	return { user: existingUser, subscribed: existingUser.subscriptionStatus };
}

export default function AccountSettings({ loaderData }: Route.ComponentProps) {
	const { user, subscribed } = loaderData;
	const signedUpOn = new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(new Date(user.createdAt));

	return (
		<Layout>
			<SettingsTabNav />
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
						<DataList.Label>Name</DataList.Label>
						<DataList.Value>{user.name}</DataList.Value>
					</DataList.Item>
					<DataList.Item align="center">
						<DataList.Label>Signed up on</DataList.Label>
						<DataList.Value>{signedUpOn}</DataList.Value>
					</DataList.Item>
					<DataList.Item align="center">
						<DataList.Label>Subscription tier</DataList.Label>
						<DataList.Value>{`${subscribed[0].toLocaleUpperCase()}${subscribed.slice(1)}`}</DataList.Value>
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
								{subscribed === "plus" ? (
									<Text>
										Manage{" "}
										<Text style={{ fontWeight: 900, fontStyle: "italic" }}>
											sill+
										</Text>{" "}
										subscription
									</Text>
								) : (
									<Text>
										Upgrade to{" "}
										<Text style={{ fontWeight: 900, fontStyle: "italic" }}>
											sill+
										</Text>{" "}
									</Text>
								)}
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
		</Layout>
	);
}
