import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { requireUserId } from "~/utils/auth.server";
import { prisma } from "~/db.server";
import { useLoaderData } from "@remix-run/react";
import { Form } from "@remix-run/react";
import {
	Badge,
	Box,
	Card,
	Heading,
	Text,
	Button,
	Flex,
	TextField,
} from "@radix-ui/themes";
import Layout from "~/components/Layout";

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const userId = await requireUserId(request);

	let user = null;
	if (userId) {
		user = await prisma.user.findUnique({
			where: { id: userId },
			include: {
				mastodonAccounts: true,
				blueskyAccounts: true,
			},
		});
	}

	return json({
		user,
	});
};

export default function Index() {
	const { user } = useLoaderData<typeof loader>();
	return (
		<Layout>
			<Box mb="8">
				<Heading size="8">Connect your accounts</Heading>
			</Box>
			<Flex gap="3">
				{user && user.mastodonAccounts.length > 0 ? (
					<Box width="50%">
						<Card>
							<Heading size="4" mb="1">
								Mastodon
							</Heading>
							<Text size="2" as="p" mb="4">
								You are successfully connected to{" "}
								<Badge>{user.mastodonAccounts[0].instance}</Badge>.
							</Text>
							<Form action="/mastodon/auth/revoke" method="post">
								<Button type="submit" size="1">
									Disconnect from Mastodon
								</Button>
							</Form>
						</Card>
					</Box>
				) : (
					<Box width="50%">
						<Card>
							<Heading size="4" mb="1">
								Mastodon
							</Heading>
							<Form action="/mastodon/auth" method="get">
								<TextField.Root
									type="url"
									name="instance"
									placeholder="Enter your Mastodon instance (e.g., https://mastodon.social)"
									required
								>
									<TextField.Slot />
								</TextField.Root>
								<Button type="submit" size="1">
									Connect to Mastodon
								</Button>
							</Form>
						</Card>
					</Box>
				)}
				{user && user.blueskyAccounts.length > 0 ? (
					<Box width="50%">
						<Card>
							<Heading size="4" mb="1">
								Bluesky
							</Heading>
							<Text size="2" as="p" mb="4">
								You are successfully connected to{" "}
								<Badge>{user.blueskyAccounts[0].handle}</Badge>.
							</Text>
							<Form action="/bluesky/auth/revoke" method="post">
								<Button type="submit" size="1">
									Disconnect from Bluesky
								</Button>
							</Form>
						</Card>
					</Box>
				) : (
					<Box width="50%">
						<Card>
							<Heading size="4" mb="1">
								Bluesky
							</Heading>
							<Form action="/bluesky/auth" method="POST">
								<TextField.Root
									name="handle"
									placeholder="Enter your Bluesky handle (e.g., tyler.bsky.social)"
									required
								>
									<TextField.Slot />
								</TextField.Root>
								<TextField.Root
									name="password"
									type="password"
									placeholder="Use an app password"
									required
								>
									<TextField.Slot />
								</TextField.Root>
								<Button type="submit" size="1">
									Connect to Bluesky
								</Button>
							</Form>
						</Card>
					</Box>
				)}
			</Flex>
		</Layout>
	);
}
