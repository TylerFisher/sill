import { prisma } from "~/db.server";
import { AtpAgent } from "@atproto/api";
import { createRestAPIClient } from "masto";

interface BskyExternalEmbed {
	uri: string;
	title: string;
	description: string;
	thumb: string;
}

export const getMastodonTimeline = async (userId: string) => {
	const yesterday = new Date(Date.now() - 86400000);

	const userWithToken = await prisma.user.findFirstOrThrow({
		where: {
			id: userId,
		},
		include: {
			mastodonTokens: true,
		},
	});
	const token = userWithToken.mastodonTokens[0];
	const client = createRestAPIClient({
		url: token.instance,
		accessToken: token.accessToken,
	});

	async function getTimeline(maxId: string | undefined = undefined) {
		let timeline = await client.v1.timelines.home.list({
			limit: 40,
			maxId,
		});
		const lastPost = timeline.at(-1);
		if (!lastPost) {
			return timeline;
		}
		const lastPostDate = new Date(lastPost.createdAt);
		if (lastPostDate > yesterday) {
			timeline = timeline.concat(await getTimeline(lastPost.id));
		}
		return timeline;
	}

	const timeline = await getTimeline();
	return timeline;
};

export const getBlueskyTimeline = async (userId: string) => {
	const yesterday = new Date(Date.now() - 86400000);
	console.log("getting bluesky timeline");

	const userWithSession = await prisma.user.findFirstOrThrow({
		where: {
			id: userId,
		},
		include: {
			BlueskyAccount: true,
		},
	});
	const bsky = userWithSession.BlueskyAccount[0];
	const agent = new AtpAgent({
		service: "https://bsky.social",
	});
	await agent.resumeSession({
		accessJwt: bsky.accessJwt,
		refreshJwt: bsky.refreshJwt,
		handle: bsky.handle,
		did: bsky.did,
		active: bsky.active,
	});

	async function getTimeline(cursor: string | undefined = undefined) {
		const response = await agent.getTimeline({
			limit: 100,
			cursor,
		});
		let timeline = response.data.feed;
		const lastPost = timeline.at(-1);
		if (!lastPost) {
			return timeline;
		}
		const lastPostDate = new Date(lastPost.post.indexedAt);
		if (lastPostDate > yesterday) {
			timeline = timeline.concat(await getTimeline(response.data.cursor));
		}
		return timeline;
	}

	const timeline = await getTimeline();
	return timeline;
};

export const getLinksFromMastodon = async (userId: string) => {
	const timeline = await getMastodonTimeline(userId);
	const links = timeline
		.filter((t) => t.card)
		.map((t) => t.card?.url)
		.filter((u) => u !== undefined);
	return links;
};

export const getLinksFromBluesky = async (userId: string) => {
	const timeline = await getBlueskyTimeline(userId);
	const links = timeline
		.filter((t) => t.post.embed?.external)
		.map((t) => {
			const external = t.post.embed?.external as BskyExternalEmbed;
			return external.uri;
		})
		.filter((u) => u !== undefined);

	return links;
};

export const countLinkOccurrences = async (userId: string) => {
	const mastodonLinks = await getLinksFromMastodon(userId);
	const blueskyLinks = await getLinksFromBluesky(userId);

	const allLinks = mastodonLinks.concat(blueskyLinks);

	const occurrences = allLinks.reduce(
		(acc, e) => acc.set(e, (acc.get(e) || 0) + 1),
		new Map(),
	);
	const sorted = [...occurrences].sort((a, b) => b[1] - a[1]);
	return sorted;
};
