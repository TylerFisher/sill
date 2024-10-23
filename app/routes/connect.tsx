import {
	json,
	type MetaFunction,
	type LoaderFunctionArgs,
} from "@remix-run/node";
import { requireUserId } from "~/utils/auth.server";
import { db } from "~/drizzle/db.server";
import { useLoaderData } from "@remix-run/react";
import { Form } from "@remix-run/react";
import {
	Badge,
	Box,
	Heading,
	Text,
	Button,
	TextField,
	Separator,
	Card,
} from "@radix-ui/themes";
import { eq } from "drizzle-orm";
import { user } from "~/drizzle/schema.server";
import Layout from "~/components/Layout";

export const meta: MetaFunction = () => [
	{ title: "Sill | Connect Your Socials" },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const userId = await requireUserId(request);

	let existingUser = null;
	if (userId) {
		existingUser = await db.query.user.findFirst({
			columns: {},
			where: eq(user.id, userId),
			with: {
				mastodonAccounts: {
					with: {
						mastodonInstance: true,
					},
				},
				blueskyAccounts: true,
			},
		});
	}

	return json({
		user: existingUser,
	});
};

export default function Index() {
	const { user } = useLoaderData<typeof loader>();
	return (
		<Layout>
			<Box mb="6">
				<Heading as="h2" size="6" mb="1">
					Connect your accounts
				</Heading>
				<Text size="3" as="p">
					Here you can connect your Mastodon and Bluesky accounts.
				</Text>
			</Box>

			{user && user.mastodonAccounts.length > 0 ? (
				<Card mb="6">
					<Heading as="h3" size="5" mb="1">
						Mastodon
					</Heading>
					<Text size="2" as="p" mb="3">
						You are connected to{" "}
						<Badge>{user.mastodonAccounts[0].mastodonInstance.instance}</Badge>.
					</Text>
					<Form action="/mastodon/auth/revoke" method="post">
						<Button type="submit" size="1">
							Disconnect from Mastodon
						</Button>
					</Form>
				</Card>
			) : (
				<Card mb="6">
					<Heading size="5" mb="1">
						Mastodon
					</Heading>
					<Form action="/mastodon/auth" method="get">
						<TextField.Root
							type="text"
							name="instance"
							placeholder="Enter your Mastodon instance (e.g., mastodon.social)"
							required
							mb="3"
						>
							<TextField.Slot>https://</TextField.Slot>
						</TextField.Root>
						<Button type="submit" size="1">
							Connect to Mastodon
						</Button>
					</Form>
				</Card>
			)}
			{user && user.blueskyAccounts.length > 0 ? (
				<Card>
					<Heading size="5" mb="1">
						Bluesky
					</Heading>
					<Text size="2" as="p" mb="3">
						You are connected to <Badge>{user.blueskyAccounts[0].handle}</Badge>
						.
					</Text>
					<Form action="/bluesky/auth/revoke" method="post">
						<Button type="submit" size="1">
							Disconnect from Bluesky
						</Button>
					</Form>
				</Card>
			) : (
				<Card>
					<Heading size="5" mb="1">
						Bluesky
					</Heading>
					<Form action="/bluesky/auth" method="POST">
						<TextField.Root
							name="handle"
							placeholder="Enter your Bluesky handle (e.g., tyler.bsky.social)"
							required
							mb="3"
						>
							<TextField.Slot />
						</TextField.Root>
						<Button type="submit" size="1">
							Connect to Bluesky
						</Button>
					</Form>
				</Card>
			)}
		</Layout>
	);
}
