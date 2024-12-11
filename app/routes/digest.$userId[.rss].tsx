import type { LoaderFunctionArgs } from "@remix-run/node";
import { desc, eq } from "drizzle-orm";
import { db } from "~/drizzle/db.server";
import { digestRssFeed, digestItem, user } from "~/drizzle/schema.server";
import { Feed } from "feed";
import { firstFeedItem } from "~/utils/digestText";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const requestUrl = new URL(request.url);
	const baseUrl = requestUrl.origin;

	const userId = params.userId;

	if (!userId) {
		throw new Error("User ID is required");
	}

	const existingUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
	});

	if (!existingUser) {
		throw new Error("User not found");
	}

	const feedWithItems = await db.query.digestRssFeed.findFirst({
		where: eq(digestRssFeed.userId, userId),
		with: {
			items: {
				limit: 10,
				orderBy: desc(digestItem.pubDate),
			},
		},
	});

	if (!feedWithItems) {
		throw new Error("Feed not found");
	}

	const feed = new Feed({
		title: feedWithItems.title,
		description: feedWithItems.description || undefined,
		id: feedWithItems.feedUrl.replace("/digest/digest", "/digest"),
		link: feedWithItems.feedUrl.replace("/digest/digest", "/digest"),
		image: "https://sill.social/favicon-96x96.png",
		favicon: "https://sill.social/favicon-96x96.png",
		copyright: "",
		updated: feedWithItems.items[0]?.pubDate || new Date(),
		generator: "Sill",
		feedLinks: {
			rss: `${baseUrl}/digest/${userId}.rss`,
		},
	});

	for (const item of feedWithItems.items) {
		const digestUrl = `${baseUrl}/digest/${userId}/${item.id}`;
		feed.addItem({
			title: item.title,
			id: digestUrl,
			link: digestUrl,
			description: item.description || undefined,
			content: item.html || undefined,
			date: item.pubDate,
		});
	}

	if (feedWithItems.items.length === 0) {
		feed.addItem({
			title: "Welcome to Sill's Daily Digest",
			id: `${baseUrl}/links`,
			link: `${baseUrl}/links`,
			description: "We'll send your first Daily Digest soon!",
			date: new Date(),
			content: `<p>${firstFeedItem(existingUser.name)}</p>`,
		});
	}

	return new Response(feed.rss2(), {
		headers: {
			"Content-Type": "application/rss+xml",
		},
	});
};
