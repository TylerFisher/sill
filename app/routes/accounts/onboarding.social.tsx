import type { Route } from "./+types/onboarding.social";
import { invariantResponse } from "@epic-web/invariant";
import { Box } from "@radix-ui/themes";
import { useSearchParams } from "react-router";
import { eq } from "drizzle-orm";
import BlueskyConnectForm from "~/components/forms/BlueskyConnectForm";
import type { ListOption } from "~/components/forms/ListSwitch";
import MastodonConnectForm from "~/components/forms/MastodonConnectForm";
import Layout from "~/components/nav/Layout";
import PageHeading from "~/components/nav/PageHeading";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import { isSubscribed, requireUserId } from "~/utils/auth.server";
import { getBlueskyLists } from "~/utils/bluesky.server";
import { getMastodonLists } from "~/utils/mastodon.server";

export const meta: Route.MetaFunction = () => [
	{ title: "Sill | Connect Accounts" },
];

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request);
	const subscribed = await isSubscribed(userId);
	const existingUser = await db.query.user.findFirst({
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
	invariantResponse(existingUser, "User not found", { status: 404 });

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
