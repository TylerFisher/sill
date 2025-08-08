import { invariantResponse } from "@epic-web/invariant";
import { Box } from "@radix-ui/themes";
import { useSearchParams } from "react-router";
import BlueskyConnectForm from "~/components/forms/BlueskyConnectForm";
import type { ListOption } from "~/components/forms/ListSwitch";
import MastodonConnectForm from "~/components/forms/MastodonConnectForm";
import Layout from "~/components/nav/Layout";
import PageHeading from "~/components/nav/PageHeading";
import { getBlueskyLists } from "~/utils/bluesky.server";
import { getMastodonLists } from "~/utils/mastodon.server";
import type { Route } from "./+types/onboarding.social";
import { requireUserFromContext } from "~/utils/context.server";

export const meta: Route.MetaFunction = () => [
	{ title: "Sill | Connect Accounts" },
];

export async function loader({ request, context }: Route.LoaderArgs) {
	const existingUser = await requireUserFromContext(context);
	invariantResponse(existingUser, "User not found", { status: 404 });

	const subscribed = existingUser.subscriptionStatus;

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

	return { user: existingUser, subscribed, listOptions };
}

export default function OnboardingSocial({ loaderData }: Route.ComponentProps) {
	const { user, subscribed, listOptions } = loaderData;
	const [searchParams] = useSearchParams();

	return (
		<Layout hideNav>
			<PageHeading
				title="Get started"
				dek="Enter your Bluesky or Mastodon handle to get started with Sill."
			/>
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
