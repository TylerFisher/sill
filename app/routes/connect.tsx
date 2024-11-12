import {
	Badge,
	Box,
	Button,
	Callout,
	Card,
	Heading,
	Link as RLink,
	Text,
	TextField,
} from "@radix-ui/themes";
import {
	type LoaderFunctionArgs,
	type MetaFunction,
	redirect,
} from "@remix-run/node";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { Form } from "@remix-run/react";
import { eq } from "drizzle-orm";
import { CircleAlert } from "lucide-react";
import Layout from "~/components/nav/Layout";
import PageHeading from "~/components/nav/PageHeading";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";

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

	const instances = await db.query.mastodonInstance.findMany({
		columns: {
			instance: true,
		},
	});

	return { user: existingUser, instances };
};

const Connect = () => {
	const { user, instances } = useLoaderData<typeof loader>();
	if (!user) return null;
	const [searchParams] = useSearchParams();
	const onboarding = searchParams.get("onboarding");
	return (
		<Layout hideNav={!!onboarding}>
			<Box mb="6">
				<PageHeading
					title="Connect your accounts"
					dek="Sill connects to your Bluesky and Mastodon accounts and gathers all of the links posted to your timeline. Then, Sill aggregates those links to show you the most popular links in your network. You can connect to one or both of these services."
				/>
			</Box>
			{user.blueskyAccounts.length > 0 ? (
				<Card mb="6">
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
				<Card mb="6">
					<Heading size="5" mb="1">
						Bluesky
					</Heading>
					<Form action="/bluesky/auth" method="GET">
						<TextField.Root
							name="handle"
							placeholder="Enter your Bluesky handle (e.g. tyler.bsky.social)"
							required
							mb="3"
						>
							<TextField.Slot>@</TextField.Slot>
						</TextField.Root>
						<Button type="submit">Connect</Button>
					</Form>
				</Card>
			)}
			{user.mastodonAccounts.length > 0 ? (
				<Card>
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
					<Callout.Root mt="4">
						<Callout.Icon>
							<CircleAlert width="18" height="18" />
						</Callout.Icon>
						<Callout.Text>
							For best performance with Sill, we recommend that you turn off the
							"Group boosts in timelines" setting in your Mastodon preferences.
							Turning this off allows us to show you everyone who posted or
							reposted a particular link. You can go{" "}
							<RLink
								href={`https://${user.mastodonAccounts[0].mastodonInstance.instance}/settings/preferences/other`}
								target="_blank"
								rel="noreferrer"
							>
								to this page
							</RLink>{" "}
							to change the setting.
						</Callout.Text>
					</Callout.Root>
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
							placeholder="Enter your Mastodon instance (e.g. mastodon.social)"
							required
							mb="3"
							list="instances"
							autoComplete="off"
						>
							<TextField.Slot>https://</TextField.Slot>
						</TextField.Root>
						<datalist id="instances">
							{instances.map((instance) => (
								<option key={instance.instance}>{instance.instance}</option>
							))}
						</datalist>
						<Button type="submit">Connect</Button>
					</Form>
					<Callout.Root mt="4">
						<Callout.Icon>
							<CircleAlert width="18" height="18" />
						</Callout.Icon>
						<Callout.Text>
							For best performance with Sill, we recommend that you turn off the
							"Group boosts in timelines" setting in your Mastodon preferences{" "}
							<strong>before you connect</strong>. Turning this off allows us to
							show you everyone who posted or reposted a particular link. Go to{" "}
							<code>https://your-instance/settings/preferences/other</code> to
							turn off the setting.
						</Callout.Text>
					</Callout.Root>
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
