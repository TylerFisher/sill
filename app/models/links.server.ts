import { prisma } from "~/db.server";
import { AtpAgent, AppBskyFeedPost } from "@atproto/api";
import { createRestAPIClient } from "masto";
import { uuidv7 } from "uuidv7-js";
import { LinkPostType, type LinkPost } from "@prisma/client";

interface BskyExternalEmbed {
	uri: string;
	title: string;
	description: string;
	thumb: string;
}

export const getMastodonTimeline = async (userId: string) => {
	const yesterday = new Date(Date.now() - 86400000);

	const account = await prisma.mastodonAccount.findFirstOrThrow({
		where: {
			userId: userId,
		},
	});
	const client = createRestAPIClient({
		url: account.instance,
		accessToken: account.accessToken,
	});

	async function getTimeline(
		maxId: string | undefined,
		sinceId: string | null | undefined,
	) {
		const timeline = await client.v1.timelines.home.list({
			limit: 40,
			maxId,
			sinceId,
		});
		let newPosts = timeline.filter(
			(post) => new Date(post.createdAt) > yesterday,
		);
		if (newPosts.length === 40) {
			const lastPost = newPosts.at(-1);
			newPosts = newPosts.concat(await getTimeline(lastPost?.id, undefined));
		}
		return newPosts;
	}

	const timeline = await getTimeline(undefined, account.mostRecentPostId);

	if (timeline.length > 0) {
		await prisma.mastodonAccount.update({
			where: {
				id: account.id,
			},
			data: {
				mostRecentPostId: timeline[0].id,
			},
		});
	}

	return timeline;
};

export const getBlueskyTimeline = async (userId: string) => {
	const account = await prisma.blueskyAccount.findFirstOrThrow({
		where: {
			userId: userId,
		},
	});
	const agent = new AtpAgent({
		service: "https://bsky.social",
	});
	await agent.resumeSession({
		accessJwt: account.accessJwt,
		refreshJwt: account.refreshJwt,
		handle: account.handle,
		did: account.did,
		active: account.active,
	});

	async function getTimeline(cursor: string | undefined = undefined) {
		const response = await agent.getTimeline({
			limit: 100,
			cursor,
		});
		const timeline = response.data.feed;
		const checkDate =
			account.mostRecentPostDate || new Date(Date.now() - 86400000); // 24 hours ago

		let reachedEnd = false;
		let newPosts = timeline.filter((item) => {
			const postDate = item.reason
				? new Date(item.reason?.indexedAt as string) // atproto is missing this type
				: new Date(item.post.indexedAt);
			if (postDate <= checkDate) {
				reachedEnd = true;
			}
			return postDate > checkDate;
		});

		if (!reachedEnd) {
			newPosts = newPosts.concat(await getTimeline(response.data.cursor));
		}

		return newPosts;
	}

	const timeline = await getTimeline();

	if (timeline.length > 0) {
		await prisma.blueskyAccount.update({
			where: {
				id: account.id,
			},
			data: {
				mostRecentPostDate: new Date(timeline[0].post.indexedAt),
			},
		});
	}

	return timeline;
};

export const getLinksFromMastodon = async (userId: string) => {
	const timeline = await getMastodonTimeline(userId);
	const links = timeline
		.filter((t) => t.card || t.reblog?.card)
		.map((t) => {
			const card = t.card || t.reblog?.card;
			const url = t.url || t.reblog?.url;
			// this shouldn't happen, but making typescript happy
			if (!card || !url) {
				return null;
			}
			return {
				id: uuidv7(),
				linkUrl: card.url,
				postUrl: url,
				type: LinkPostType.mastodon,
				postDate: new Date(t.createdAt),
				repost: !!t.reblog,
			};
		})
		.filter((t) => !!t);

	await prisma.linkPost.createMany({
		data: links,
	});

	return links;
};

export const getLinksFromBluesky = async (userId: string) => {
	const timeline = await getBlueskyTimeline(userId);
	const links = timeline
		.filter((t) => t.post.embed?.external)
		.map((t) => {
			const external = t.post.embed?.external as BskyExternalEmbed;
			return {
				id: uuidv7(),
				linkUrl: external.uri,
				postUrl: t.post.uri,
				type: LinkPostType.bluesky,
				postDate: new Date(t.post.indexedAt),
				repost: t.reason?.$type === "app.bsky.feed.defs#reasonRepost",
			};
		});

	await prisma.linkPost.createMany({
		data: links,
	});

	return links;
};

export const countLinkOccurrences = async (userId: string) => {
	const timelines = await Promise.all([
		getLinksFromMastodon(userId),
		getLinksFromBluesky(userId),
	]);
	const yesterday = new Date(Date.now() - 86400000);
	const mostRecentLinks = await prisma.linkPost.groupBy({
		by: ["linkUrl"],
		where: {
			postDate: {
				gte: yesterday,
			},
		},
		_count: {
			linkUrl: true,
		},
		orderBy: {
			_count: {
				linkUrl: "desc",
			},
		},
	});

	console.log(mostRecentLinks);

	return mostRecentLinks;
};
