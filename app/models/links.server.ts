import {
	AppBskyFeedDefs,
	Agent,
	AppBskyFeedPost,
	AppBskyEmbedRecord,
	AppBskyEmbedExternal,
	AppBskyEmbedImages,
	AppBskyRichtextFacet,
	type AppBskyActorDefs,
	RichText,
} from "@atproto/api";
import {
	OAuthResponseError,
	type OAuthSession,
} from "@atproto/oauth-client-node";
import { createRestAPIClient, type mastodon } from "masto";
import { uuidv7 } from "uuidv7-js";
import { PostType } from "@prisma/client";
import groupBy from "object.groupby";
import { Prisma } from "@prisma/client";
import { extractFromUrl } from "@jcottam/html-metadata";
import { createOAuthClient } from "~/server/oauth/client";
import { prisma } from "~/db.server";
import { linksQueue } from "~/queue.server";

interface BskyDetectedLink {
	uri: string;
	title: string | null;
	description: string | null;
	imageUrl?: string | null;
}

const ONE_DAY_MS = 86400000; // 24 hours in milliseconds

const fetchRebloggedPosts = async (
	client: mastodon.rest.Client,
	status: mastodon.v1.Status,
) => {
	const rebloggedPosts: mastodon.v1.Status[] = [];
	for await (const rebloggerGroup of client.v1.statuses
		.$select(status.id)
		.rebloggedBy.list()) {
		for await (const reblogger of rebloggerGroup) {
			for await (const rebloggerStatuses of client.v1.accounts
				.$select(reblogger.id)
				.statuses.list()) {
				let foundStatus = false;
				for await (const rebloggerStatus of rebloggerStatuses) {
					if (rebloggerStatus.reblog?.id === status.id) {
						rebloggedPosts.push(rebloggerStatus);
						foundStatus = true;
						break;
					}
				}
				if (foundStatus) {
					break;
				}
			}
		}
	}

	return rebloggedPosts;
};

export const getMastodonTimeline = async (userId: string) => {
	const yesterday = new Date(Date.now() - ONE_DAY_MS);

	const account = await prisma.mastodonAccount.findFirst({
		where: {
			userId: userId,
		},
	});

	if (!account) return [];

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
				ended = true;
				break;
			}
			if (status.id === account.mostRecentPostId) {
				ended = true;
				break;
			}

			// NASTY. Mastodon doesn't return reblogs if you follow the original poster.
			// We need those reblogs. So we have to find the rebloggers and search their
			// timelines for the reblog post.
			if (status.reblogsCount > 0) {
				const rebloggedPosts = await fetchRebloggedPosts(client, status);
				timeline.push(...rebloggedPosts);
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

const handleBlueskyOAuth = async (account: { did: string }) => {
	let oauthSession: OAuthSession | null = null;
	try {
		const client = await createOAuthClient();
		oauthSession = await client.restore(account.did);
	} catch (error) {
		if (error instanceof OAuthResponseError) {
			const client = await createOAuthClient();
			oauthSession = await client.restore(account.did);
		}
	}
	return oauthSession;
};

export const getBlueskyTimeline = async (userId: string) => {
	const account = await prisma.blueskyAccount.findFirst({
		where: {
			userId: userId,
		},
	});
	if (!account) return [];

	const oauthSession = await handleBlueskyOAuth(account);
	if (!oauthSession) return [];

	const agent = new Agent(oauthSession);

	async function getTimeline(cursor: string | undefined = undefined) {
		const response = await agent.getTimeline({
			limit: 100,
			cursor,
		});
		const timeline = response.data.feed;
		const checkDate =
			account?.mostRecentPostDate || new Date(Date.now() - ONE_DAY_MS); // 24 hours ago

		let reachedEnd = false;
		let newPosts = timeline.filter((item) => {
			const postDate = AppBskyFeedDefs.isReasonRepost(item.reason)
				? new Date(item.reason.indexedAt)
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
		const tokenSet = await oauthSession.getTokenSet();

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
				accessJwt: tokenSet.access_token,
				refreshJwt: tokenSet.refresh_token,
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

	// Sometimes Mastodon returns broken cards for YouTube.
	// I know I shouldn't regex HTML, but here we are.
	if (original.card?.url === "https://www.youtube.com/undefined") {
		const regex =
			/(https:\/\/(?:www\.youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+(?:<[^>]+>)*[\w-]+(?:\?(?:[\w-=&]+(?:<[^>]+>)*[\w-=&]+)?)?)/g;
		const youtubeUrls = original.content.match(regex);
		if (youtubeUrls) {
			original.card.url = youtubeUrls[0];
		}
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
	const postUrl = `https://bsky.app/profile/${t.post.author.handle}/post/${t.post.uri.split("/").at(-1)}`;

	// Handle embeds
	let quoted: AppBskyFeedDefs.PostView["embed"] | null = null;
	let quotedRecord: AppBskyEmbedRecord.ViewRecord | null = null;
	let quotedValue: AppBskyFeedPost.Record | null = null;
	let externalRecord: AppBskyEmbedExternal.View | null = null;
	let quotedImageGroup: AppBskyEmbedImages.ViewImage[] = [];
	let detectedLink: BskyDetectedLink | null = null;
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
			const imageGroup = quotedRecord?.embeds?.find((embed) =>
				AppBskyEmbedImages.isView(embed),
			);
			if (imageGroup) {
				quotedImageGroup = imageGroup.images;
			}
		}
		if (AppBskyFeedPost.isRecord(quoted.record.value)) {
			quotedValue = quoted.record.value;
			if (!externalRecord) {
				detectedLink = await findBlueskyLinkFacets(quotedValue);
			}
		}
	}

	if (AppBskyEmbedExternal.isView(t.post.embed)) {
		externalRecord = t.post.embed;
	}

	// check for a post with a link but no preview card
	if (!externalRecord) {
		if (!detectedLink) {
			detectedLink = await findBlueskyLinkFacets(record);
		}
	} else {
		detectedLink = {
			uri: externalRecord.external.uri,
			title: externalRecord.external.title,
			description: externalRecord.external.description,
			imageUrl: externalRecord.external.thumb,
		};
	}

	if (!detectedLink) {
		return null;
	}
	// handle image
	let imageGroup: AppBskyEmbedImages.ViewImage[] = [];
	if (AppBskyEmbedImages.isView(t.post.embed)) {
		imageGroup = t.post.embed.images;
	}

	let linkPoster: AppBskyActorDefs.ProfileViewBasic | null = null;
	if (AppBskyFeedDefs.isReasonRepost(t.reason)) {
		linkPoster = t.reason.by;
	} else {
		linkPoster = t.post.author;
	}

	await prisma.linkPost.upsert({
		where: {
			linkUrl_postUrl_userId_actorHandle: {
				linkUrl: detectedLink.uri,
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
						images: {
							createMany: {
								data: imageGroup.map((image) => ({
									id: uuidv7(),
									url: image.fullsize,
									alt: image.alt,
								})),
							},
						},
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
												images: {
													createMany: {
														data: quotedImageGroup.map((image) => ({
															id: uuidv7(),
															url: image.fullsize,
															alt: image.alt,
														})),
													},
												},
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
						url: detectedLink.uri,
					},
					create: {
						id: uuidv7(),
						url: detectedLink.uri,
						title: detectedLink.title || "",
						description: detectedLink.description,
						imageUrl: detectedLink.imageUrl,
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
					console.log("processing bluesky error", t.post.uri);
					await processBlueskyLink(userId, t);
				}
			} else {
				console.error(e);
			}
		}
	}
};

const findBlueskyLinkFacets = async (record: AppBskyFeedPost.Record) => {
	let foundLink: BskyDetectedLink | null = null;
	const rt = new RichText({
		text: record.text,
		facets: record.facets,
	});
	for await (const segment of rt.segments()) {
		if (
			segment.link &&
			AppBskyRichtextFacet.validateLink(segment.link).success
		) {
			const existingLink = await prisma.link.findFirst({
				where: {
					url: segment.link.uri,
				},
			});

			// if we already have data
			if (existingLink?.description) {
				return {
					uri: existingLink.url,
					title: existingLink.title,
					imageUrl: existingLink.imageUrl,
					description: existingLink.description,
				};
			}
			await linksQueue.add("fetchMetadata", { uri: segment.link.uri });
			foundLink = {
				uri: segment.link.uri,
				title: "",
				imageUrl: null,
				description: null,
			};
			break;
		}
	}
	return foundLink;
};

export const fetchLinkMetadata = async (uri: string) => {
	const foundLink = await prisma.link.findFirst({
		where: {
			url: uri,
		},
	});

	// if we already have data
	if (foundLink?.description) {
		return;
	}

	try {
		const metadata = await extractFromUrl(uri, {
			timeout: 5000,
		});
		if (metadata) {
			await prisma.link.upsert({
				where: {
					url: uri,
				},
				update: {
					title: metadata["og:title"] || metadata.title,
					description:
						metadata["og:description"] || metadata.description || null,
					imageUrl: metadata["og:image"] || null,
				},
				create: {
					id: uuidv7(),
					url: uri,
					title: metadata["og:title"] || metadata.title,
					description:
						metadata["og:description"] || metadata.description || null,
					imageUrl: metadata["og:image"] || null,
				},
			});
		}
	} catch (e) {
		console.error(`Failed to fetch link ${uri}`, e);
	}
};

interface LinkOccurrenceArgs {
	userId: string;
	time?: number;
	hideReposts?: boolean;
	sort?: string;
	query?: string | undefined;
	fetch?: boolean;
}

export const countLinkOccurrences = async ({
	userId,
	time = ONE_DAY_MS,
	hideReposts = false,
	sort = "popularity",
	query = undefined,
	fetch = false,
}: LinkOccurrenceArgs) => {
	if (fetch) {
		await Promise.all([
			getLinksFromMastodon(userId),
			getLinksFromBluesky(userId),
		]);
	}

	const mutePhrases = await prisma.mutePhrase.findMany({
		where: {
			userId,
		},
	});

	const mutePhraseSearch = mutePhrases.map((p) => `${p.phrase}`).join(" | ");
	const encodedQuery = query ? query.trim().split(" ").join(" & ") : undefined;

	const searchQuery: Prisma.LinkPostWhereInput[] | undefined = encodedQuery
		? [
				{
					link: {
						description: {
							search: encodedQuery,
							mode: "insensitive",
						},
					},
				},
				{
					link: {
						title: {
							search: encodedQuery,
							mode: "insensitive",
						},
					},
				},
				{
					post: {
						text: {
							search: encodedQuery,
							mode: "insensitive",
						},
					},
				},
				{
					post: {
						quoting: {
							text: {
								search: encodedQuery,
								mode: "insensitive",
							},
						},
					},
				},
			]
		: undefined;

	const start = new Date(Date.now() - time);
	const mostRecentLinkPosts = await prisma.linkPost.findMany({
		where: {
			userId,
			OR: searchQuery,
			NOT: {
				OR: [
					{
						link: {
							description: {
								search: mutePhraseSearch,
								mode: "insensitive",
							},
						},
					},
					{
						link: {
							title: {
								search: mutePhraseSearch,
								mode: "insensitive",
							},
						},
					},
					{
						post: {
							text: {
								search: mutePhraseSearch,
								mode: "insensitive",
							},
						},
					},
					{
						post: {
							quoting: {
								text: {
									search: mutePhraseSearch,
									mode: "insensitive",
								},
							},
						},
					},
					{
						post: {
							actor: {
								name: {
									search: mutePhraseSearch,
									mode: "insensitive",
								},
							},
						},
					},
					{
						post: {
							actor: {
								handle: {
									search: mutePhraseSearch,
									mode: "insensitive",
								},
							},
						},
					},
					{
						actor: {
							name: {
								search: mutePhraseSearch,
								mode: "insensitive",
							},
						},
					},
					{
						actor: {
							handle: {
								search: mutePhraseSearch,
								mode: "insensitive",
							},
						},
					},
				],
			},
			post: {
				postDate: {
					gte: start,
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
							images: true,
						},
					},
					images: true,
				},
			},
			actor: true,
		},
		orderBy: {
			post: {
				postDate: "desc",
			},
		},
	});

	const grouped = groupBy(mostRecentLinkPosts, (l) => {
		return l.link.url;
	});

	if (hideReposts) {
		for (const url in grouped) {
			const group = grouped[url];
			grouped[url] = group.filter(
				(linkPost) => linkPost.actorHandle === linkPost.post.actorHandle,
			);
			if (grouped[url].length === 0) {
				delete grouped[url];
			}
		}
	}

	if (sort === "popularity") {
		const sorted = Object.entries(grouped).sort(
			(a, b) =>
				[...new Set(b[1].map((l) => l.actorHandle))].length -
				[...new Set(a[1].map((l) => l.actorHandle))].length,
		);
		return sorted.slice(0, 20);
	}

	return Object.entries(grouped).slice(0, 20);
};
