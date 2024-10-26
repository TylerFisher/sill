import {
	json,
	type MetaFunction,
	type LoaderFunctionArgs,
	redirect,
} from "@vercel/remix";
import { requireUserId } from "~/utils/auth.server";
import { db } from "~/drizzle/db.server";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { Form } from "@remix-run/react";
import {
	Badge,
	Box,
	Heading,
	Text,
	Button,
	TextField,
	Card,
} from "@radix-ui/themes";
import { eq } from "drizzle-orm";
import { user } from "~/drizzle/schema.server";
import Layout from "~/components/nav/Layout";
import PageHeading from "~/components/nav/PageHeading";

export const meta: MetaFunction = () => [
	{ title: "Sill | Connect Your Socials" },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const userId = await requireUserId(request);
	if (!userId) {
		return redirect("accounts/login");
	}
	const existingUser = await db.query.user.findFirst({
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

	return json({
		user: existingUser,
	});
};

const Connect = () => {
	const { user } = useLoaderData<typeof loader>();
	if (!user) return null;
	const [searchParams] = useSearchParams();
	const onboarding = searchParams.get("onboarding");
	return (
		<Layout hideNav={!!onboarding}>
			<Box mb="6">
				<PageHeading
					title="Connect your accounts"
					dek="Sill connects to your Mastodon and Bluesky accounts and gathers all of the links posted to your timeline. Then, Sill aggregates those links to show you the most popular links in your network. You can connect to one or both of these services."
				/>
			</Box>

			{user.mastodonAccounts.length > 0 ? (
				<Card mb="6">
					<Heading as="h3" size="5" mb="1">
						Mastodon
					</Heading>
					<Text size="2" as="p" mb="3">
						You are connected to{" "}
						<Badge>{user.mastodonAccounts[0].mastodonInstance.instance}</Badge>.
					</Text>
					<Form action="/mastodon/auth/revoke" method="post">
						<Button type="submit">Disconnect</Button>
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
						<Button type="submit">Connect</Button>
					</Form>
				</Card>
			)}
			{user.blueskyAccounts.length > 0 ? (
				<Card>
					<Heading size="5" mb="1">
						Bluesky
					</Heading>
					<Text size="2" as="p" mb="3">
						You are connected to <Badge>{user.blueskyAccounts[0].handle}</Badge>
						.
					</Text>
					<Form action="/bluesky/auth/revoke" method="post">
						<Button type="submit">Disconnect</Button>
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
						<Button type="submit">Connect</Button>
					</Form>
				</Card>
			)}
			{onboarding &&
				(user.blueskyAccounts.length > 0 ||
					user.mastodonAccounts.length > 0) && (
					<Box mt="4">
						<Link to="/email?onboarding=true">
							<Button>Set up daily email</Button>
						</Link>
					</Box>
				)}
		</Layout>
	);
};

export default Connect;
