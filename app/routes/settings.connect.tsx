import { json, type LoaderFunctionArgs } from "@remix-run/node";
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
} from "@radix-ui/themes";
import { eq } from "drizzle-orm";
import { user } from "~/drizzle/schema.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const userId = await requireUserId(request);

	let existingUser = null;
	if (userId) {
		existingUser = await db.query.user.findFirst({
			columns: {},
			where: eq(user.id, userId),
			with: {
				mastodonAccounts: true,
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
		<Box>
			{user && user.mastodonAccounts.length > 0 ? (
				<Box>
					<Heading size="4" mb="1">
						Mastodon
					</Heading>
					<Text size="2" as="p" mb="3">
						You are connected to{" "}
						<Badge>{user.mastodonAccounts[0].instance}</Badge>.
					</Text>
					<Form action="/mastodon/auth/revoke" method="post">
						<Button type="submit" size="1">
							Disconnect from Mastodon
						</Button>
					</Form>
				</Box>
			) : (
				<Box>
					<Heading size="4" mb="1">
						Mastodon
					</Heading>
					<Form action="/mastodon/auth" method="get">
						<TextField.Root
							type="url"
							name="instance"
							placeholder="Enter your Mastodon instance (e.g., https://mastodon.social)"
							required
							mb="3"
						>
							<TextField.Slot />
						</TextField.Root>
						<Button type="submit" size="1">
							Connect to Mastodon
						</Button>
					</Form>
				</Box>
			)}
			<Separator size="4" my="6" />
			{user && user.blueskyAccounts.length > 0 ? (
				<Box>
					<Heading size="4" mb="1">
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
				</Box>
			) : (
				<Box>
					<Heading size="4" mb="1">
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
				</Box>
			)}
		</Box>
	);
}
