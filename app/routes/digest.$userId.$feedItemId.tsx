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

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const userId = await requireUserId(request);

	if (!userId) {
		return redirect("/accounts/login");
	}

	const feedItemId = params.feedItemId;

	if (!feedItemId) {
		throw new Error("Feed item ID is required");
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

	const feedItem = await db.query.digestItem.findFirst({
		where: eq(digestItem.id, feedItemId),
	});

	if (!feedItem || !feedItem.json) {
		throw new Error("Feed item not found");
	}

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
		bsky,
		instance: mastodon?.mastodonInstance.instance,
	};
};

const DigestFeedItem = () => {
	const { links, bsky, instance } = useLoaderData<typeof loader>();

	return (
		<Layout>
			{links?.map((link) => (
				<LinkPost
					key={link.link?.id}
					linkPost={link}
					instance={instance}
					bsky={bsky}
				/>
			))}
		</Layout>
	);
};

export default DigestFeedItem;
