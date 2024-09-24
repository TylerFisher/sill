import { prisma } from "~/db.server";
import { AtpAgent, AppBskyFeedPost } from "@atproto/api";
import { createRestAPIClient } from "masto";
import { uuidv7 } from "uuidv7-js";
import { PostType } from "@prisma/client";
import groupBy from "object.groupby";

interface BskyExternalEmbed {
	uri: string;
	title: string;
	description: string;
	thumb: string;
}

interface BskyReposter {
	handle: string;
	name?: string;
	avatar?: string;
	did: string;
}

interface BskyRecord {
	text: string;
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
	const linksOnly = timeline.filter((t) => t.card || t.reblog?.card);
	for (const t of linksOnly) {
		const original = t.reblog || t;
		const url = original.url;
		const card = original.card;

		if (!url || !card) {
			continue;
		}

		await prisma.linkPost.upsert({
			where: {
				linkUrl_postUrl_userId_actorHandle: {
					linkUrl: card.url,
					postUrl: url,
					userId,
					actorHandle: t.account.username,
				},
			},
			create: {
				id: uuidv7(),
				post: {
					connectOrCreate: {
						where: {
							url,
						},
						create: {
							id: uuidv7(),
							url,
							text: original.text || "",
							postDate: original.createdAt,
							postType: PostType.mastodon,
							actor: {
								connectOrCreate: {
									where: {
										handle: original.account.username,
									},
									create: {
										id: uuidv7(),
										name: original.account.displayName,
										handle: original.account.username,
										url: original.account.url,
										avatarUrl: original.account.avatar,
									},
								},
							},
						},
					},
				},
				link: {
					connectOrCreate: {
						where: {
							url: original.card?.url,
						},
						create: {
							id: uuidv7(),
							url: card.url,
							title: card.title,
							description: original.card?.description,
							imageUrl: original.card?.image,
						},
					},
				},
				actor: {
					connectOrCreate: {
						where: {
							handle: t.account.username,
						},
						create: {
							id: uuidv7(),
							handle: t.account.username,
							url: t.account.url,
							name: t.account.displayName,
							avatarUrl: t.account.avatar,
						},
					},
				},
				user: {
					connect: {
						id: userId,
					},
				},
			},
			update: {},
		});
	}
};

export const getLinksFromBluesky = async (userId: string) => {
	const timeline = await getBlueskyTimeline(userId);
	const linksOnly = timeline.filter((t) => t.post.embed?.external);
	for (const t of linksOnly) {
		const external = t.post.embed?.external as BskyExternalEmbed;
		const linkPoster =
			(t.reason?.by as BskyReposter) || (t.post.author as BskyReposter);
		const record = t.post.record as BskyRecord;
		await prisma.linkPost.upsert({
			where: {
				linkUrl_postUrl_userId_actorHandle: {
					linkUrl: external.uri,
					postUrl: t.post.uri,
					userId,
					actorHandle: linkPoster.handle,
				},
			},
			create: {
				id: uuidv7(),
				post: {
					connectOrCreate: {
						where: {
							url: t.post.uri,
						},
						create: {
							id: uuidv7(),
							url: t.post.uri,
							text: record.text,
							postDate: new Date(t.post.indexedAt),
							postType: PostType.bluesky,
							actor: {
								connectOrCreate: {
									where: {
										handle: t.post.author.handle,
									},
									create: {
										id: uuidv7(),
										name: t.post.author.displayName || "",
										handle: t.post.author.handle,
										url: t.post.author.did,
										avatarUrl: t.post.author.avatar,
									},
								},
							},
						},
					},
				},
				link: {
					connectOrCreate: {
						where: {
							url: external.uri,
						},
						create: {
							id: uuidv7(),
							url: external.uri,
							title: external.title,
							description: external.description,
							imageUrl: external.thumb,
						},
					},
				},
				actor: {
					connectOrCreate: {
						where: {
							handle: linkPoster.handle,
						},
						create: {
							id: uuidv7(),
							handle: linkPoster.handle,
							url: linkPoster.did,
							name: linkPoster.name,
							avatarUrl: linkPoster.avatar,
						},
					},
				},
				user: {
					connect: {
						id: userId,
					},
				},
			},
			update: {},
		});
	}
};

export const countLinkOccurrences = async (userId: string) => {
	await Promise.all([
		getLinksFromMastodon(userId),
		getLinksFromBluesky(userId),
	]);
	const yesterday = new Date(Date.now() - 86400000);
	const mostRecentLinkPosts = await prisma.linkPost.findMany({
		where: {
			userId,
			post: {
				postDate: {
					gte: yesterday,
				},
			},
		},
		include: {
			link: true,
			post: {
				include: {
					actor: true,
				},
			},
			actor: true,
		},
	});

	const grouped = groupBy(mostRecentLinkPosts, (l) => l.link.url);
	const sorted = Object.entries(grouped).sort(
		(a, b) => b[1].length - a[1].length,
	);
	return sorted;
};
