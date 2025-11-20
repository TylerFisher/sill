import { invariantResponse } from "@epic-web/invariant";
import { Box } from "@radix-ui/themes";
import { Await, redirect, useSearchParams } from "react-router";
import { Suspense } from "react";
import BlueskyConnectForm from "~/components/forms/BlueskyConnectForm";
import type { ListOption } from "~/components/forms/ListSwitch";
import MastodonConnectForm from "~/components/forms/MastodonConnectForm";
import Layout from "~/components/nav/Layout";
import PageHeading from "~/components/nav/PageHeading";
import SettingsTabNav from "~/components/settings/SettingsTabNav";
import type { Route } from "./+types/connections";
import { requireUserFromContext } from "~/utils/context.server";
import {
	apiGetBlueskyLists,
	apiGetMastodonLists,
	apiCheckBlueskyStatus,
} from "~/utils/api-client.server";

export const meta: Route.MetaFunction = () => [
	{ title: "Sill | Connection Settings" },
];

export async function loader({ request, context }: Route.LoaderArgs) {
	const existingUser = await requireUserFromContext(context);
	invariantResponse(existingUser, "User not found", { status: 404 });
	const subscribed = existingUser.subscriptionStatus;

	if (existingUser.blueskyAccounts.length > 0) {
		try {
			const statusResult = await apiCheckBlueskyStatus(request);

			if (
				statusResult.needsAuth &&
				"redirectUrl" in statusResult &&
				statusResult.redirectUrl
			) {
				return redirect(statusResult.redirectUrl);
			}

			if (
				statusResult.status === "error" &&
				"error" in statusResult &&
				statusResult.error === "resolver"
			) {
				const url = new URL(request.url);
				if (!url.searchParams.has("error")) {
					url.searchParams.set("error", "resolver");
					return redirect(url.toString());
				}
			}
		} catch (error) {
			console.error("Bluesky status check error:", error);
		}
	}

	const bskyPromise =
		existingUser.blueskyAccounts.length > 0 && subscribed
			? apiGetBlueskyLists(request).catch((e) => {
					console.error("error getting bluesky lists", e);
					return { lists: [] };
				})
			: Promise.resolve({ lists: [] });

	const mastodonPromise =
		existingUser.mastodonAccounts.length > 0 && subscribed !== "free"
			? apiGetMastodonLists(request).catch((e) => {
					console.error("error getting mastodon lists", e);
					return { lists: [] };
				})
			: Promise.resolve({ lists: [] });

	return { user: existingUser, subscribed, bskyPromise, mastodonPromise };
}

export default function ConnectionSettings({
	loaderData,
}: Route.ComponentProps) {
	const { user, subscribed, bskyPromise, mastodonPromise } = loaderData;
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
			<Suspense
				fallback={
					<BlueskyConnectForm
						account={user.blueskyAccounts[0]}
						subscribed={subscribed}
						searchParams={searchParams}
						listOptions={[]}
						loading={true}
					/>
				}
			>
				<Await resolve={bskyPromise}>
					{(bskyData) => (
						<BlueskyConnectForm
							account={user.blueskyAccounts[0]}
							subscribed={subscribed}
							searchParams={searchParams}
							listOptions={bskyData.lists.filter((l) => l.type === "bluesky")}
							loading={false}
						/>
					)}
				</Await>
			</Suspense>
			<Suspense
				fallback={
					<MastodonConnectForm
						account={user.mastodonAccounts[0]}
						subscribed={subscribed}
						searchParams={searchParams}
						listOptions={[]}
						loading={true}
					/>
				}
			>
				<Await resolve={mastodonPromise}>
					{(mastodonData) => (
						<MastodonConnectForm
							account={user.mastodonAccounts[0]}
							subscribed={subscribed}
							searchParams={searchParams}
							listOptions={mastodonData.lists.filter(
								(l) => l.type === "mastodon",
							)}
							loading={false}
						/>
					)}
				</Await>
			</Suspense>
		</Layout>
	);
}
