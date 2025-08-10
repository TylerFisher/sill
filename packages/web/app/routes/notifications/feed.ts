import { Feed } from "feed";
import type { Route } from "./+types/feed";
import { apiGetNotificationGroupFeed } from "~/utils/api-client.server";

type NotificationGroupWithItems = Awaited<ReturnType<typeof apiGetNotificationGroupFeed>>;

export const loader = async ({ request, params }: Route.LoaderArgs) => {
	const requestUrl = new URL(request.url);
	const baseUrl = requestUrl.origin;

	const notificationGroupId = params.notificationGroupId;

	if (!notificationGroupId) {
		throw new Error("Notification Group ID is required");
	}

	let group: NotificationGroupWithItems;
	try {
		group = await apiGetNotificationGroupFeed(request, notificationGroupId);
	} catch (error) {
		throw new Error("Feed not found");
	}

	const feed = new Feed({
		title: `${group.name} Notifications from Sill`,
		description: "",
		id: group.feedUrl || "",
		link: group.feedUrl || "",
		image: "https://sill.social/favicon-96x96.png",
		favicon: "https://sill.social/favicon-96x96.png",
		copyright: "",
		updated: group.items[0]?.createdAt ? new Date(group.items[0].createdAt) : new Date(),
		generator: "Sill",
		feedLinks: {
			rss: `${baseUrl}/notifications/${notificationGroupId}.rss`,
		},
	});

	for (const item of group.items) {
		if (!item.itemData.link) {
			continue;
		}

		feed.addItem({
			title: item.itemData.link.title,
			id: item.itemData.link.url,
			link: item.itemData.link.url,
			description: item.itemData.link.description || undefined,
			content: item.itemHtml || undefined,
			date: new Date(item.createdAt),
		});
	}

	if (group.items.length === 0) {
		feed.addItem({
			title: `${group.name} Notifications from Sill`,
			id: `${baseUrl}/notifications`,
			link: `${baseUrl}/notifications`,
			description: "We'll send your first notification soon!",
			date: new Date(),
			content: `<p>Your notification feed is set up. We'll send your first notification soon!</p>`,
		});
	}

	return new Response(feed.rss2(), {
		headers: {
			"Content-Type": "application/rss+xml",
		},
	});
};
