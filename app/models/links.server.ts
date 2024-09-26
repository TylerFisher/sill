import { prisma } from "~/db.server";
import {
	AppBskyFeedDefs,
	AtpAgent,
	AppBskyFeedPost,
	AppBskyEmbedRecord,
	AppBskyEmbedExternal,
	type AppBskyActorDefs,
} from "@atproto/api";
import { createRestAPIClient, type mastodon } from "masto";
import { uuidv7 } from "uuidv7-js";
import { PostType } from "@prisma/client";
import groupBy from "object.groupby";
import { Prisma } from "@prisma/client";

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

	const timeline: mastodon.v1.Status[] = [];
	let ended = false;
	for await (const statuses of client.v1.timelines.home.list({
		sinceId: account.mostRecentPostId,
	})) {
		if (ended) break;
		for await (const status of statuses) {
			if (new Date(status.createdAt) <= yesterday) {
				continue;
			}
			if (status.id === account.mostRecentPostId) {
				ended = true;
				break;
			}
			timeline.push(status);
		}
	}

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
		const firstPost = timeline[0];

		await prisma.blueskyAccount.update({
			where: {
				id: account.id,
			},
			data: {
				mostRecentPostDate: new Date(
					AppBskyFeedDefs.isReasonRepost(firstPost.reason)
						? firstPost.reason.indexedAt
						: firstPost.post.indexedAt,
				),
				accessJwt: agent.session?.accessJwt,
				refreshJwt: agent.session?.refreshJwt,
			},
		});
	}
	return timeline;
};

const processMastodonLink = async (userId: string, t: mastodon.v1.Status) => {
	const original = t.reblog || t;
	const url = original.url;
	const card = original.card;

	if (!url || !card) {
		return null;
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
						text: original.content,
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
};

export const getLinksFromMastodon = async (userId: string) => {
	const timeline = await getMastodonTimeline(userId);
	const linksOnly = timeline.filter((t) => t.card || t.reblog?.card);
	for await (const t of linksOnly) {
		try {
			await processMastodonLink(userId, t);
		} catch (e) {
			if (e instanceof Prisma.PrismaClientKnownRequestError) {
				if (e.code === "P2002") {
					await processMastodonLink(userId, t);
				}
			}
		}
	}
};

const processBlueskyLink = async (
	userId: string,
	t: AppBskyFeedDefs.FeedViewPost,
) => {
	let record: AppBskyFeedPost.Record | null = null;
	if (AppBskyFeedPost.isRecord(t.post.record)) {
		record = t.post.record;
	}
	if (!record) {
		return null;
	}

	// Handle embeds
	let quoted: AppBskyFeedDefs.PostView["embed"] | null = null;
	let quotedRecord: AppBskyEmbedRecord.ViewRecord | null = null;
	let quotedValue: AppBskyFeedPost.Record | null = null;
	let externalRecord: AppBskyEmbedExternal.View | null = null;
	if (AppBskyEmbedRecord.isView(t.post.embed)) {
		quoted = t.post.embed;
		if (AppBskyEmbedRecord.isViewRecord(quoted.record)) {
			quotedRecord = quoted.record;
			const embeddedLink = quotedRecord.embeds?.find((e) =>
				AppBskyEmbedExternal.isView(e),
			);
			if (embeddedLink) {
				externalRecord = embeddedLink;
			}
		}
		if (AppBskyFeedPost.isRecord(quoted.record.value)) {
			quotedValue = quoted.record.value;
		}
	}

	if (AppBskyEmbedExternal.isView(t.post.embed)) {
		externalRecord = t.post.embed;
	}

	if (!externalRecord) {
		return null;
	}

	let linkPoster: AppBskyActorDefs.ProfileViewBasic | null = null;
	if (AppBskyFeedDefs.isReasonRepost(t.reason)) {
		linkPoster = t.reason.by;
	} else {
		linkPoster = t.post.author;
	}

	const postUrl = `https://bsky.app/profile/${t.post.author.did}/post/${t.post.uri.split("/").at(-1)}`;

	await prisma.linkPost.upsert({
		where: {
			linkUrl_postUrl_userId_actorHandle: {
				linkUrl: externalRecord.external.uri,
				postUrl: postUrl,
				userId,
				actorHandle: linkPoster.handle,
			},
		},
		create: {
			id: uuidv7(),
			post: {
				connectOrCreate: {
					where: {
						url: postUrl,
					},
					create: {
						id: uuidv7(),
						url: postUrl,
						text: record.text,
						postDate: new Date(t.post.indexedAt),
						postType: PostType.bluesky,
						quoting:
							quotedValue && quotedRecord
								? {
										connectOrCreate: {
											where: {
												url: `https://bsky.app/profile/${quotedRecord.author.did}/post/${quotedRecord.uri.split("/").at(-1)}`,
											},
											create: {
												id: uuidv7(),
												url: `https://bsky.app/profile/${quotedRecord.author.did}/post/${quotedRecord.uri.split("/").at(-1)}`,
												text: quotedValue.text,
												postDate: new Date(quotedRecord.indexedAt),
												postType: PostType.bluesky,
												actor: {
													connectOrCreate: {
														where: {
															handle: quotedRecord.author.handle,
														},
														create: {
															id: uuidv7(),
															name: quotedRecord.author.displayName,
															handle: quotedRecord.author.handle,
															url: `https://bsky.app/profile/${quotedRecord.author.did}`,
															avatarUrl: quotedRecord.author.avatar,
														},
													},
												},
											},
										},
									}
								: undefined,
						actor: {
							connectOrCreate: {
								where: {
									handle: t.post.author.handle,
								},
								create: {
									id: uuidv7(),
									name: t.post.author.displayName || "",
									handle: t.post.author.handle,
									url: `https://bsky.app/profile/${t.post.author.did}`,
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
						url: externalRecord.external.uri,
					},
					create: {
						id: uuidv7(),
						url: externalRecord.external.uri,
						title: externalRecord.external.title,
						description: externalRecord.external.description,
						imageUrl: externalRecord.external.thumb,
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
						url: `https://bsky.app/profile/${linkPoster.did}`,
						name: linkPoster.displayName,
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
};

export const getLinksFromBluesky = async (userId: string) => {
	const timeline = await getBlueskyTimeline(userId);
	for await (const t of timeline) {
		try {
			await processBlueskyLink(userId, t);
		} catch (e) {
			if (e instanceof Prisma.PrismaClientKnownRequestError) {
				if (e.code === "P2002") {
					await processBlueskyLink(userId, t);
				}
			}
		}
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
					quoting: {
						include: {
							actor: true,
						},
					},
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
