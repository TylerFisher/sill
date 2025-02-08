import type { Route } from "./+types/connect";
import { Box } from "@radix-ui/themes";
import { redirect } from "react-router";
import { useSearchParams } from "react-router";
import { eq } from "drizzle-orm";
import BlueskyConnectForm from "~/components/forms/BlueskyConnectForm";
import type { ListOption } from "~/components/forms/ListSwitch";
import Layout from "~/components/nav/Layout";
import MastodonConnectForm from "~/components/forms/MastodonConnectForm";
import PageHeading from "~/components/nav/PageHeading";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import { isSubscribed, requireUserId } from "~/utils/auth.server";
import { getBlueskyLists } from "~/utils/bluesky.server";
import { getMastodonLists } from "~/utils/mastodon.server";

export const meta: Route.MetaFunction = () => [
	{ title: "Sill | Connect Your Accounts" },
];

export const loader = async ({ request }: Route.LoaderArgs) => {
	const userId = await requireUserId(request);
	if (!userId) {
		return redirect("accounts/login") as never;
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
		return redirect("accounts/login") as never;
	}

	const subscribed = await isSubscribed(userId);

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

	return { user: existingUser, listOptions, subscribed };
};

const Connect = ({ loaderData }: Route.ComponentProps) => {
	const { user, listOptions, subscribed } = loaderData;
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
		</Layout>
	);
};

export default Connect;
