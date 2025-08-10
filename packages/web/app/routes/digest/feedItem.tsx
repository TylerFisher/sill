import { Heading } from "@radix-ui/themes";
import Layout from "~/components/nav/Layout";
import { LinkPost } from "~/routes/links/index";
import { useLayout } from "~/routes/resources/layout-switch";
import type { Route } from "./+types/feedItem";
import { requireUserFromContext } from "~/utils/context.server";
import { apiGetDigestItem } from "~/utils/api-client.server";

export const meta: Route.MetaFunction = () => [
	{ title: "Sill | Daily Digest" },
];

export const loader = async ({
	params,
	context,
	request,
}: Route.LoaderArgs) => {
	const existingUser = await requireUserFromContext(context);
	const subscribed = existingUser.subscriptionStatus;

	const feedItemId = params.feedItemId;

	if (!feedItemId) {
		throw new Error("Feed item ID is required");
	}

	try {
		const { feedItem } = await apiGetDigestItem(request, feedItemId);

		if (!feedItem || !feedItem.json) {
			throw new Error("Feed item not found");
		}

		const bsky = existingUser.blueskyAccounts[0];
		const mastodon = existingUser.mastodonAccounts[0];
		const bookmarks = existingUser.bookmarks;

		return {
			links: feedItem.json,
			pubDate: feedItem.pubDate,
			bsky: bsky?.handle,
			instance: mastodon?.mastodonInstance.instance,
			bookmarks,
			subscribed,
		};
	} catch (error) {
		console.error("Digest feed item error:", error);

		if (
			error instanceof Error &&
			error.message.includes("Feed item not found")
		) {
			throw new Error("Feed item not found");
		}

		if (error instanceof Error && error.message.includes("Not authenticated")) {
			throw new Error("Unauthorized");
		}

		throw new Error("Failed to load digest feed item");
	}
};

const DigestFeedItem = ({ loaderData }: Route.ComponentProps) => {
	const { links, bsky, instance, pubDate, bookmarks } = loaderData;
	const date = new Intl.DateTimeFormat("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(new Date(pubDate));
	const layout = useLayout();

	return (
		<Layout>
			<Heading as="h2" mt="4" size="6">
				Your Sill Daily Digest
			</Heading>
			<Heading as="h3" size="4" mb="6" color="yellow">
				{date}
			</Heading>
			{links?.map((link) => (
				<div key={link.link?.id} id={link.link?.id}>
					<LinkPost
						linkPost={link}
						instance={instance}
						bsky={bsky}
						layout={layout}
						bookmarks={bookmarks}
						subscribed={loaderData.subscribed}
					/>
				</div>
			))}
		</Layout>
	);
};

export default DigestFeedItem;
