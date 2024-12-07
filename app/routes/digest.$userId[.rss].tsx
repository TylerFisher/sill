import type { LoaderFunctionArgs } from "@remix-run/node";
import { desc, eq } from "drizzle-orm";
import { db } from "~/drizzle/db.server";
import { digestRssFeed, digestRssFeedItem } from "~/drizzle/schema.server";
import { Feed } from "feed";

export const loader = async ({ params }: LoaderFunctionArgs) => {
	const userId = params.userId;

	if (!userId) {
		throw new Error("User ID is required");
	}

	const feedWithItems = await db.query.digestRssFeed.findFirst({
		where: eq(digestRssFeed.userId, userId),
		with: {
			items: {
				limit: 10,
				orderBy: desc(digestRssFeedItem.pubDate),
			},
		},
	});

	if (!feedWithItems) {
		throw new Error("Feed not found");
	}

	const feed = new Feed({
		title: feedWithItems.title,
		description: feedWithItems.description || undefined,
		id: feedWithItems.id,
		link: feedWithItems.feedUrl,
		image: "https://sill.social/favicon-96x96.png",
		favicon: "https://sill.social/favicon-96x96.png",
		copyright: "All rights reserved 2024, Sill",
		updated: feedWithItems.items[0].pubDate,
		generator: "Sill",
		feedLinks: {
			rss: `https://sill.social/digest/${userId}.rss`,
		},
	});

	for (const item of feedWithItems.items) {
		feed.addItem({
			title: item.title,
			id: item.id,
			link: `https://sill.social/digest/${userId}/${item.id}`,
			description: item.description || undefined,
			content: item.html || undefined,
			date: item.pubDate,
		});
	}

	return new Response(feed.rss2(), {
		headers: {
			"Content-Type": "application/rss+xml",
		},
	});
};
