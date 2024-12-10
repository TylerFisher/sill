import type { LoaderFunctionArgs } from "@remix-run/node";
import { desc, eq } from "drizzle-orm";
import { db } from "~/drizzle/db.server";
import { digestRssFeed, digestItem } from "~/drizzle/schema.server";
import { Feed } from "feed";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const requestUrl = new URL(request.url);
	const baseUrl = `${requestUrl.origin}/digest`;

	const userId = params.userId;

	if (!userId) {
		throw new Error("User ID is required");
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
		id: feedWithItems.feedUrl,
		link: feedWithItems.feedUrl,
		image: "https://sill.social/favicon-96x96.png",
		favicon: "https://sill.social/favicon-96x96.png",
		copyright: "",
		updated: feedWithItems.items[0].pubDate,
		generator: "Sill",
		feedLinks: {
			rss: `${baseUrl}/${userId}.rss`,
		},
	});

	for (const item of feedWithItems.items) {
		const digestUrl = `${baseUrl}/${userId}/${item.id}`;
		feed.addItem({
			title: item.title,
			id: digestUrl,
			link: digestUrl,
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
