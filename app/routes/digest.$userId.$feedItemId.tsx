import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { eq } from "drizzle-orm";
import { db } from "~/drizzle/db.server";
import {
	blueskyAccount,
	digestItem,
	mastodonAccount,
} from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";
import { LinkPost } from "./links";
import Layout from "~/components/nav/Layout";
import { Heading } from "@radix-ui/themes";
import { useLayout } from "./resources.layout-switch";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const userId = await requireUserId(request);

	if (!userId) {
		return redirect("/accounts/login");
	}

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
	};
};

const DigestFeedItem = () => {
	const { links, bsky, instance, pubDate } = useLoaderData<typeof loader>();
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
					/>
				</div>
			))}
		</Layout>
	);
};

export default DigestFeedItem;
