import { Feed } from "feed";
import { firstFeedItem } from "~/utils/digestText";
import { apiGetDigestFeed } from "~/utils/api-client.server";
import type { Route } from "./+types/feed";

export const loader = async ({ request, params }: Route.LoaderArgs) => {
	const requestUrl = new URL(request.url);
	const baseUrl = requestUrl.origin;

	const userId = params.userId;

	if (!userId) {
		throw new Error("User ID is required");
	}

	try {
		const { user: existingUser, feed: feedWithItems } = await apiGetDigestFeed(request, userId);

		if (!existingUser || !feedWithItems) {
			throw new Response(null, {
				status: 404,
				statusText: "Not Found",
			});
		}

		const feed = new Feed({
			title: feedWithItems.title,
			description: feedWithItems.description || undefined,
			id: feedWithItems.feedUrl.replace("/digest/digest", "/digest"),
			link: feedWithItems.feedUrl.replace("/digest/digest", "/digest"),
			image: "https://sill.social/favicon-96x96.png",
			favicon: "https://sill.social/favicon-96x96.png",
			copyright: "",
			updated: feedWithItems.items[0]?.pubDate ? new Date(`${feedWithItems.items[0].pubDate}Z`) : new Date(),
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
				date: new Date(`${item.pubDate}Z`),
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
	} catch (error) {
		console.error("Digest feed error:", error);
		
		if (error instanceof Error && error.message.includes("User not found")) {
			throw new Response(null, {
				status: 404,
				statusText: "Not Found",
			});
		}
		
		if (error instanceof Error && error.message.includes("Feed not found")) {
			throw new Error("Feed not found");
		}
		
		throw new Error("Failed to load digest feed");
	}
};
