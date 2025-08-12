import { invariantResponse } from "@epic-web/invariant";
import { Box } from "@radix-ui/themes";
import { useSearchParams } from "react-router";
import BlueskyConnectForm from "~/components/forms/BlueskyConnectForm";
import type { ListOption } from "~/components/forms/ListSwitch";
import MastodonConnectForm from "~/components/forms/MastodonConnectForm";
import Layout from "~/components/nav/Layout";
import PageHeading from "~/components/nav/PageHeading";
import SettingsTabNav from "~/components/settings/SettingsTabNav";
import type { Route } from "./+types/connections";
import { requireUserFromContext } from "~/utils/context.server";
import { apiGetBlueskyLists, apiGetMastodonLists } from "~/utils/api-client.server";


export const meta: Route.MetaFunction = () => [
	{ title: "Sill | Connection Settings" },
];

export async function loader({ request, context }: Route.LoaderArgs) {
	const existingUser = await requireUserFromContext(context);
	invariantResponse(existingUser, "User not found", { status: 404 });
	const subscribed = existingUser.subscriptionStatus;

	const listOptions: ListOption[] = [];

	if (existingUser.blueskyAccounts.length > 0 && subscribed) {
		try {
			const response = await apiGetBlueskyLists(request);
			listOptions.push(...response.lists);
		} catch (e) {
			console.error("error getting bluesky lists", e);
		}
	}

	if (existingUser.mastodonAccounts.length > 0 && subscribed !== "free") {
		try {
			const response = await apiGetMastodonLists(request);
			listOptions.push(...response.lists);
		} catch (e) {
			console.error("error getting mastodon lists", e);
		}
	}
	return { user: existingUser, subscribed, listOptions };
}

export default function ConnectionSettings({
	loaderData,
}: Route.ComponentProps) {
	const { user, listOptions, subscribed } = loaderData;
	const [searchParams] = useSearchParams();

	return (
		<Layout>
			<SettingsTabNav />
			<Box mb="6">
				<PageHeading
					title="Connections"
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
}
