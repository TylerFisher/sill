import { invariantResponse } from "@epic-web/invariant";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { requireUserId } from "~/utils/auth.server";
import { db } from "~/drizzle/db.server";
import Layout from "~/components/nav/Layout";
import { eq } from "drizzle-orm";
import { user } from "~/drizzle/schema.server";
import { Box, Button, Flex, Heading } from "@radix-ui/themes";
import { Form, Link, useLoaderData } from "@remix-run/react";
import { DataList, AlertDialog } from "@radix-ui/themes";

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request);
	const existingUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
	});
	invariantResponse(existingUser, "User not found", { status: 404 });
	return { user: existingUser };
}

export default function EditUserProfile() {
	const data = useLoaderData<typeof loader>();
	const signedUpOn = new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(new Date(data.user.createdAt));

	return (
		<Layout>
			<Box>
				<Heading as="h2" mb="2">
					Account
				</Heading>
				<DataList.Root>
					<DataList.Item align="center">
						<DataList.Label>Email</DataList.Label>
						<DataList.Value>{data.user.email}</DataList.Value>
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
							<Button
								type="submit"
								variant="soft"
								style={{
									width: "100%",
								}}
							>
								Log out
							</Button>
						</Form>
					</Box>
					<Box>
						<Link to="/accounts/change-email">
							<Button
								type="submit"
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
								type="submit"
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
							<Flex gap="3" mt="4">
								<AlertDialog.Cancel>
									<Button variant="soft" color="gray">
										No, keep my account
									</Button>
								</AlertDialog.Cancel>
								<AlertDialog.Action>
									<Form method="post" action="/accounts/user/delete">
										<Button color="red" type="submit">
											Yes, delete my account
										</Button>
									</Form>
								</AlertDialog.Action>
							</Flex>
						</AlertDialog.Content>
					</AlertDialog.Root>
				</Flex>
			</Box>
		</Layout>
	);
}
