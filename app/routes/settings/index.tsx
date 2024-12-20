import type { Route } from "./+types/index";
import { invariantResponse } from "@epic-web/invariant";
import { Box, Button, Flex, Heading } from "@radix-ui/themes";
import { AlertDialog, DataList } from "@radix-ui/themes";
import { Form, Link } from "react-router";
import { eq } from "drizzle-orm";
import SubmitButton from "~/components/forms/SubmitButton";
import Layout from "~/components/nav/Layout";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";

export const meta: Route.MetaFunction = () => [
	{ title: "Sill | Account Settings" },
];

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request);
	const existingUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
	});
	invariantResponse(existingUser, "User not found", { status: 404 });
	return { user: existingUser };
}

export default function EditUserProfile({ loaderData }: Route.ComponentProps) {
	const signedUpOn = new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(new Date(loaderData.user.createdAt));

	return (
		<Layout>
			<Box>
				<Heading as="h2" mb="2">
					Account
				</Heading>
				<DataList.Root>
					<DataList.Item align="center">
						<DataList.Label>Email</DataList.Label>
						<DataList.Value>{loaderData.user.email}</DataList.Value>
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
