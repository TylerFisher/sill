import { Heading } from "@radix-ui/themes";
import { eq } from "drizzle-orm";
import Layout from "~/components/nav/Layout";
import { db } from "~/drizzle/db.server";
import {
	blueskyAccount,
	bookmark,
	digestItem,
	mastodonAccount,
} from "~/drizzle/schema.server";
import { LinkPost } from "~/routes/links/index";
import { useLayout } from "~/routes/resources/layout-switch";
import type { Route } from "./+types/feedItem";
import { requireUserFromContext } from "~/utils/context.server";

export const meta: Route.MetaFunction = () => [
	{ title: "Sill | Daily Digest" },
];

export const loader = async ({ params, context }: Route.LoaderArgs) => {
	const existingUser = await requireUserFromContext(context);
	const userId = existingUser.id;
	const subscribed = existingUser.subscriptionStatus;

	const feedItemId = params.feedItemId;

	if (!feedItemId) {
		throw new Error("Feed item ID is required");
	}

	const feedItem = await db.query.digestItem.findFirst({
		where: eq(digestItem.id, feedItemId),
	});

	if (!feedItem || !feedItem.json) {
		throw new Error("Feed item not found");
	}

	if (feedItem.userId !== userId) {
		throw new Error("Unauthorized");
	}

	const bsky = await db.query.blueskyAccount.findFirst({
		where: eq(blueskyAccount.userId, userId),
	});

	const mastodon = await db.query.mastodonAccount.findFirst({
		where: eq(mastodonAccount.userId, userId),
		with: {
			mastodonInstance: true,
		},
	});

	const bookmarks = await db.query.bookmark.findMany({
		where: eq(bookmark.userId, userId),
	});

	for (const item of feedItem.json) {
		if (!item.posts) {
			continue;
		}
		for (const post of item.posts) {
			post.postDate = new Date(post.postDate);
			post.quotedPostDate =
				post.quotedPostDate && new Date(post.quotedPostDate);
		}
	}

	return {
		links: feedItem.json,
		pubDate: feedItem.pubDate,
		bsky: bsky?.handle,
		instance: mastodon?.mastodonInstance.instance,
		bookmarks,
		subscribed,
	};
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
