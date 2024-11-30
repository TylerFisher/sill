import { Box, Button } from "@radix-ui/themes";
import {
	type LoaderFunctionArgs,
	type MetaFunction,
	redirect,
} from "@remix-run/node";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { eq } from "drizzle-orm";
import BlueskyConnectForm from "~/components/forms/BlueskyConnectForm";
import type { ListOption } from "~/components/forms/ListSwitch";
import Layout from "~/components/nav/Layout";
import MastodonConnectForm from "~/components/forms/MastodonConnectForm";
import PageHeading from "~/components/nav/PageHeading";
import { db } from "~/drizzle/db.server";
import { emailSettings, user } from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";
import EmailSettingForm from "~/components/forms/EmailSettingsForm";
import { createOAuthClient } from "~/server/oauth/client";
import { Agent } from "@atproto/api";
import { createRestAPIClient } from "masto";

export const meta: MetaFunction = () => [
	{ title: "Sill | Connect Your Accounts" },
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

	if (!existingUser) {
		return redirect("accounts/login");
	}

	const instances = await db.query.mastodonInstance.findMany({
		columns: {
			instance: true,
		},
	});

	const currentSettings = await db.query.emailSettings.findFirst({
		where: eq(emailSettings.userId, userId),
	});

	const listOptions: ListOption[] = [];

	if (existingUser.blueskyAccounts.length > 0) {
		const account = existingUser.blueskyAccounts[0];
		const client = await createOAuthClient();
		const session = await client.restore(account.did);
		const agent = new Agent(session);
		const prefs = await agent.getPreferences();
		const lists = prefs.savedFeeds;
		for (const list of lists) {
			if (list.type === "list") {
				const listData = await agent.app.bsky.graph.getList({
					list: list.value,
				});
				listOptions.push({
					name: listData.data.list.name,
					uri: listData.data.list.uri,
					type: "bluesky",
					subscribed: account.lists.some(
						(l) => l.uri === listData.data.list.uri,
					),
				});
			} else if (list.type === "feed") {
				const feedData = await agent.app.bsky.feed.getFeedGenerator({
					feed: list.value,
				});
				listOptions.push({
					name: feedData.data.view.displayName,
					uri: feedData.data.view.uri,
					type: "bluesky",
					subscribed: account.lists.some(
						(l) => l.uri === feedData.data.view.uri,
					),
				});
			}
		}
	}

	if (existingUser.mastodonAccounts.length > 0) {
		const account = existingUser.mastodonAccounts[0];
		const client = createRestAPIClient({
			url: `https://${account.mastodonInstance.instance}`,
			accessToken: account.accessToken,
		});
		const lists = await client.v1.lists.list();
		for (const list of lists) {
			listOptions.push({
				name: list.title,
				uri: list.id,
				type: "mastodon",
				subscribed: account.lists.some((l) => l.uri === list.id),
			});
		}
	}

	return { user: existingUser, instances, currentSettings, listOptions };
};

const Connect = () => {
	const { user, currentSettings, listOptions } = useLoaderData<typeof loader>();
	console.log(listOptions);
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
			<BlueskyConnectForm
				account={user.blueskyAccounts[0]}
				searchParams={searchParams}
				listOptions={listOptions.filter((l) => l.type === "bluesky")}
			/>
			<MastodonConnectForm
				account={user.mastodonAccounts[0]}
				searchParams={searchParams}
				listOptions={listOptions.filter((l) => l.type === "mastodon")}
			/>
		</Layout>
	);
};

export default Connect;
