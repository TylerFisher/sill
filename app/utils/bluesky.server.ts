import {
	AppBskyFeedDefs,
	Agent,
	AppBskyFeedPost,
	AppBskyEmbedRecord,
	AppBskyEmbedExternal,
	AppBskyEmbedImages,
	AppBskyRichtextFacet,
	RichText,
	AppBskyEmbedRecordWithMedia,
} from "@atproto/api";
import {
	OAuthResponseError,
	type OAuthSession,
} from "@atproto/oauth-client-node";
import { uuidv7 } from "uuidv7-js";
import { and, eq, getTableColumns, type SQL, sql } from "drizzle-orm";
import { extractFromUrl } from "@jcottam/html-metadata";
import { createOAuthClient } from "~/server/oauth/client";
import { db } from "~/drizzle/db.server";
import { linksQueue } from "~/utils/queue.server";
import {
	actor,
	blueskyAccount,
	link,
	linkPost,
	linkPostToUser,
	post,
	postImage,
	postType,
	post as schemaPost,
} from "~/drizzle/schema.server";
import type { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import type { PgTable } from "drizzle-orm/pg-core";

interface BskyDetectedLink {
	uri: string;
	title: string | null;
	description: string | null;
	imageUrl?: string | null;
}

const ONE_DAY_MS = 86400000; // 24 hours in milliseconds

/**
 * Restores Bluesky OAuth session based on account did.
 * Handles OAuthResponseError (for DPoP nonce) by attempting to restore session again.
 * @param account Account object with did
 * @returns Bluesky OAuth session
 */
export const handleBlueskyOAuth = async (account: { did: string }) => {
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

/**
 * Fetches new posts from Bluesky timeline and updates account with most recent post date.
 * @param userId ID for logged in user
 * @returns New posts from Bluesky timeline
 */
export const getBlueskyTimeline = async (userId: string) => {
	const account = await db.query.blueskyAccount.findFirst({
		where: eq(blueskyAccount.userId, userId),
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
		const checkDate = account?.mostRecentPostDate
			? account.mostRecentPostDate
			: new Date(Date.now() - ONE_DAY_MS);

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

		await db
			.update(blueskyAccount)
			.set({
				mostRecentPostDate: AppBskyFeedDefs.isReasonRepost(firstPost.reason)
					? new Date(firstPost.reason.indexedAt)
					: new Date(firstPost.post.indexedAt),
				accessJwt: tokenSet.access_token,
				refreshJwt: tokenSet.refresh_token,
			})
			.where(eq(blueskyAccount.userId, userId));
	}
	return timeline;
};

/**
 * Constructs a full URL for a Bluesky post
 * @param authorHandle Handle of the author of the post
 * @param postUri Full AT URI of the post
 * @returns Full URL for the post
 */
const getPostUrl = async (authorHandle: string, postUri: string) => {
	return `https://bsky.app/profile/${authorHandle}/post/${postUri.split("/").at(-1)}`;
};

/**
 * Handles embeds in a Bluesky post
 * @param embed Embed object from Bluesky post
 * @returns Quoted post, external link, and image group data
 */
const handleEmbeds = async (embed: PostView["embed"]) => {
	let quoted: AppBskyFeedDefs.PostView["embed"] | null = null;
	let quotedRecord: AppBskyEmbedRecord.ViewRecord | null = null;
	let quotedValue: AppBskyFeedPost.Record | null = null;
	let externalRecord: AppBskyEmbedExternal.View | null = null;
	let quotedImageGroup: AppBskyEmbedImages.ViewImage[] = [];
	let detectedLink: BskyDetectedLink | null = null;
	let quotedPostUrl: string | null = null;
	let imageGroup: AppBskyEmbedImages.ViewImage[] = [];

	if (AppBskyEmbedRecord.isView(embed)) {
		quoted = embed;
	} else if (AppBskyEmbedRecordWithMedia.isView(embed)) {
		quoted = embed.record;
		if (AppBskyEmbedExternal.isView(embed.media)) {
			externalRecord = embed.media;
		}
		if (AppBskyEmbedImages.isView(embed.media)) {
			imageGroup = embed.media.images;
		}
	}
	if (quoted) {
		if (AppBskyEmbedRecord.isViewRecord(quoted.record)) {
			quotedRecord = quoted.record;
			quotedPostUrl = await getPostUrl(
				quotedRecord.author.handle,
				quotedRecord.uri,
			);
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
			const quotedRecordWithMedia = quotedRecord?.embeds?.find((embed) =>
				AppBskyEmbedRecordWithMedia.isView(embed),
			);
			if (quotedRecordWithMedia) {
				if (AppBskyEmbedImages.isView(quotedRecordWithMedia.media)) {
					quotedImageGroup = quotedRecordWithMedia.media.images;
				}
				if (AppBskyEmbedExternal.isView(quotedRecordWithMedia.media)) {
					externalRecord = quotedRecordWithMedia.media;
				}
			}
		}
		if (AppBskyFeedPost.isRecord(quoted.record.value)) {
			quotedValue = quoted.record.value;
			if (!externalRecord) {
				detectedLink = await findBlueskyLinkFacets(quotedValue);
			}
		}
	}

	if (AppBskyEmbedExternal.isView(embed)) {
		externalRecord = embed;
	}
	if (AppBskyEmbedImages.isView(embed)) {
		imageGroup = embed.images;
	}

	return {
		quotedRecord,
		quotedValue,
		externalRecord,
		quotedImageGroup,
		detectedLink,
		quotedPostUrl,
		imageGroup,
	};
};

/**
 * Checks for an external record in a Bluesky post
 * If available, returns the external record
 * If not, searches for a link facet in the post record
 * @param record Record from Bluesky post
 * @param externalRecord External record from Bluesky post
 * @returns Detected link from Bluesky post
 */
const getDetectedLink = async (
	record: AppBskyFeedPost.Record,
	externalRecord: AppBskyEmbedExternal.View | null,
	initialDetectedLink: BskyDetectedLink | null = null,
) => {
	let detectedLink = initialDetectedLink;
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
	return detectedLink;
};

/**
 * Retrieves original actor, quoted actor, and repost actor from a Bluesky post
 * @param t Bluesky post object
 * @param quotedRecord Parse quoted record from Bluesky post
 * @returns All actors from the post object
 */
const getActors = async (
	t: AppBskyFeedDefs.FeedViewPost,
	quotedRecord: AppBskyEmbedRecord.ViewRecord | null,
) => {
	const actors = [
		{
			id: uuidv7(),
			handle: t.post.author.handle,
			url: `https://bsky.app/profile/${t.post.author.handle}`,
			name: t.post.author.displayName,
			avatarUrl: t.post.author.avatar,
		},
	];

	if (quotedRecord) {
		actors.push({
			id: uuidv7(),
			handle: quotedRecord.author.handle,
			url: `https://bsky.app/profile/${quotedRecord.author.handle}`,
			name: quotedRecord.author.displayName,
			avatarUrl: quotedRecord.author.avatar,
		});
	}

	if (AppBskyFeedDefs.isReasonRepost(t.reason)) {
		actors.push({
			id: uuidv7(),
			handle: t.reason.by.handle,
			url: `https://bsky.app/profile/${t.reason.by.handle}`,
			name: t.reason.by.displayName,
			avatarUrl: t.reason.by.avatar,
		});
	}

	return actors;
};

/**
 *
 * @param quotedValue Value of the quoted post
 * @param quotedRecord ViewRecord of the quoted post
 * @param quotedPostUrl URL to the quoted post
 * @returns Quoted post object for the database
 */
const getQuotedPost = async (
	quotedValue: AppBskyFeedPost.Record | null,
	quotedRecord: AppBskyEmbedRecord.ViewRecord | null,
	quotedPostUrl: string | null,
) => {
	return quotedValue && quotedRecord
		? {
				id: uuidv7(),
				url: quotedPostUrl || "",
				text: serializeBlueskyPostToHtml(quotedValue),
				postDate: new Date(quotedRecord.indexedAt),
				postType: postType.enumValues[0],
				actorHandle: quotedRecord.author.handle,
			}
		: undefined;
};

/**
 *
 * @param imageGroup Image group for original post
 * @param quotedImageGroup Image group for quoted post
 * @param postId Post ID for original post
 * @param quotedPostId Post ID for quoted post
 * @returns List of images for the database
 */
const getImages = async (
	imageGroup: AppBskyEmbedImages.ViewImage[],
	quotedImageGroup: AppBskyEmbedImages.ViewImage[],
	postId: string,
	quotedPostId: string | undefined,
) => {
	let images = imageGroup.map((image) => ({
		id: uuidv7(),
		alt: image.alt,
		url: image.thumb,
		postId: postId,
	}));

	if (quotedPostId) {
		images = images.concat(
			quotedImageGroup.map((image) => ({
				id: uuidv7(),
				alt: image.alt,
				url: image.thumb,
				postId: quotedPostId,
			})),
		);
	}

	return images;
};

/**
 * Searches for a link post that matches the current post and link in the database
 * @param postUrl URL for Bluesky post
 * @param detectedLinkUri Detected link URI in the post
 * @param t Bluesky post object
 * @returns Link post if one exists, null if not
 */
const searchForLinkPost = async (
	postUrl: string,
	detectedLinkUri: string,
	t: AppBskyFeedDefs.FeedViewPost,
) => {
	const linkPostSearch = await db.transaction(async (tx) => {
		const existingPost = await tx.query.post.findFirst({
			where: and(
				eq(schemaPost.url, postUrl),
				AppBskyFeedDefs.isReasonRepost(t.reason)
					? eq(schemaPost.repostHandle, t.reason.by.handle)
					: undefined,
			),
			columns: {
				id: true,
			},
		});

		if (existingPost) {
			const existingLinkPost = await tx.query.linkPost.findFirst({
				where: and(
					eq(linkPost.linkUrl, detectedLinkUri),
					eq(linkPost.postId, existingPost.id),
				),
				columns: { id: true },
			});

			return {
				linkPost: existingLinkPost,
			};
		}
		return null;
	});

	return linkPostSearch;
};

/**
 * Processes a post from Bluesky timeline to detect links and prepares data for database insertion
 * @param userId ID for logged in user
 * @param t Post object from Bluesky timeline
 * @returns Actors, quoted post, images, post, link, and new link post to insert into database
 */
const processBlueskyLink = async (
	userId: string,
	t: AppBskyFeedDefs.FeedViewPost,
) => {
	let record: AppBskyFeedPost.Record | null = null;
	if (AppBskyFeedPost.isRecord(t.post.record)) {
		record = t.post.record;
	} else {
		return null;
	}
	const postUrl = await getPostUrl(t.post.author.handle, t.post.uri);

	const {
		quotedRecord,
		quotedValue,
		quotedImageGroup,
		quotedPostUrl,
		externalRecord,
		detectedLink: initialDetectedLink,
		imageGroup,
	} = await handleEmbeds(t.post.embed);

	const detectedLink = await getDetectedLink(
		record,
		externalRecord,
		initialDetectedLink,
	);

	if (!detectedLink) {
		return null;
	}

	const linkPostSearch = await searchForLinkPost(postUrl, detectedLink.uri, t);

	// If we've already seen this link post, we can just subscribe our user to it and move on
	if (linkPostSearch?.linkPost) {
		await db
			.insert(linkPostToUser)
			.values({
				userId,
				linkPostId: linkPostSearch.linkPost.id,
			})
			.onConflictDoNothing();

		return null;
	}

	const actors = await getActors(t, quotedRecord);
	const quotedPost = await getQuotedPost(
		quotedValue,
		quotedRecord,
		quotedPostUrl,
	);

	const post = {
		id: uuidv7(),
		url: postUrl,
		text: serializeBlueskyPostToHtml(record),
		postDate: new Date(t.post.indexedAt),
		postType: postType.enumValues[0],
		actorHandle: t.post.author.handle,
		quotingId: quotedPost ? quotedPost.id : undefined,
		repostHandle: AppBskyFeedDefs.isReasonRepost(t.reason)
			? t.reason.by.handle
			: undefined,
	};

	const images = await getImages(
		imageGroup,
		quotedImageGroup,
		post.id,
		quotedPost?.id,
	);

	const link = {
		id: uuidv7(),
		url: detectedLink.uri,
		title: detectedLink.title || "",
		description: detectedLink.description,
		imageUrl: detectedLink.imageUrl,
	};

	const newLinkPost = {
		id: uuidv7(),
		linkUrl: link.url,
		postId: post.id,
		date: new Date(t.post.indexedAt),
	};

	return {
		actors,
		quotedPost,
		images,
		post,
		link,
		newLinkPost,
	};
};

/**
 * Gets Bluesky timeline, processes posts, and inserts data into database
 * @param userId ID for logged in user
 * @returns void
 */
export const getLinksFromBluesky = async (userId: string) => {
	const timeline = await getBlueskyTimeline(userId);
	const processedResults = (
		await Promise.all(timeline.map((t) => processBlueskyLink(userId, t)))
	).filter((p) => p !== null);

	if (processedResults.length === 0) {
		return null;
	}

	const actors = processedResults.flatMap((p) => p.actors);
	const quotedPosts = processedResults
		.map((p) => p.quotedPost)
		.filter((p) => p !== undefined);
	const posts = processedResults.map((p) => p.post);

	const links = Object.values(
		processedResults.reduce(
			(acc, p) => {
				const existing = acc[p.link.url];
				if (
					!existing ||
					(p.link.title && !existing.title) ||
					(p.link.description && !existing.description) ||
					(p.link.imageUrl && !existing.imageUrl)
				) {
					acc[p.link.url] = p.link;
				}
				return acc;
			},
			{} as Record<string, (typeof processedResults)[0]["link"]>,
		),
	);
	const linkPosts = processedResults.map((p) => p.newLinkPost);
	const images = processedResults.flatMap((p) => p.images);

	await db.transaction(async (tx) => {
		if (actors.length > 0)
			await tx.insert(actor).values(actors).onConflictDoNothing();
		if (quotedPosts.length > 0)
			await tx.insert(post).values(quotedPosts).onConflictDoNothing();
		if (posts.length > 0)
			await tx.insert(post).values(posts).onConflictDoNothing();
		if (links.length > 0)
			await tx
				.insert(link)
				.values(links)
				.onConflictDoUpdate({
					target: [link.url],
					set: buildConflictUpdateColumns(link, ["title", "description"]),
				});
		if (images.length > 0)
			await tx.insert(postImage).values(images).onConflictDoNothing();
		if (linkPosts.length > 0) {
			const createdLinkPosts = await tx
				.insert(linkPost)
				.values(linkPosts)
				.onConflictDoNothing()
				.returning({
					id: linkPost.id,
				});
			await tx.insert(linkPostToUser).values(
				createdLinkPosts.map((lp) => ({
					userId,
					linkPostId: lp.id,
				})),
			);
		}
	});
};

/**
 * Searches for a link facet in a Bluesky post record
 * If found, passes the link to the metadata fetcher
 * @param record Bluesky Post Record
 * @returns Detected link from post record
 */
const findBlueskyLinkFacets = async (record: AppBskyFeedPost.Record) => {
	let foundLink: BskyDetectedLink | null = null;
	const rt = new RichText({
		text: record.text,
		facets: record.facets,
	});
	for await (const segment of rt.segments()) {
		if (
			segment.link &&
			AppBskyRichtextFacet.validateLink(segment.link).success &&
			!segment.link.uri.includes("bsky.app")
		) {
			const existingLink = await db.query.link.findFirst({
				where: eq(link.url, segment.link.uri),
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

/**
 * Fetches metadata for a link and inserts it into the database
 * Used by the link metadata fetcher queue in Redis
 * @param uri URI to fetch metadata for
 * @returns void
 */
export const fetchLinkMetadata = async (uri: string) => {
	const foundLink = await db.query.link.findFirst({
		where: eq(link.url, uri),
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
			await db
				.insert(link)
				.values({
					id: uuidv7(),
					url: uri,
					title: metadata["og:title"] || metadata.title,
					description:
						metadata["og:description"] || metadata.description || null,
					imageUrl: metadata["og:image"] || null,
				})
				.onConflictDoUpdate({
					target: link.url,
					set: {
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

const buildConflictUpdateColumns = <
	T extends PgTable,
	Q extends keyof T["_"]["columns"],
>(
	table: T,
	columns: Q[],
) => {
	const cls = getTableColumns(table);
	return columns.reduce(
		(acc, column) => {
			const colName = cls[column].name;
			acc[column] = sql.raw(`excluded.${colName}`);
			return acc;
		},
		{} as Record<Q, SQL>,
	);
};

const serializeBlueskyPostToHtml = (post: AppBskyFeedPost.Record) => {
	const rt = new RichText({
		text: post.text,
		facets: post.facets,
	});
	const html: string[] = [];
	for (const segment of rt.segments()) {
		if (segment.text && !segment.facet && !segment.link) {
			html.push(segment.text);
		} else if (segment.link && !segment.facet) {
			html.push(`<a href="${segment.link.uri}">${segment.link.text}</a>`);
		} else if (
			segment.facet?.features.find((f) => AppBskyRichtextFacet.isLink(f))
		) {
			const linkFacet = segment.facet.features.find((f) =>
				AppBskyRichtextFacet.isLink(f),
			);
			if (linkFacet) {
				html.push(`<a href=${linkFacet.uri}>${segment.text}</a>`);
			}
		} else if (
			segment.facet?.features.find((f) => AppBskyRichtextFacet.isMention(f))
		) {
			const mentionFacet = segment.facet.features.find((f) =>
				AppBskyRichtextFacet.isMention(f),
			);
			if (mentionFacet) {
				console.log(segment, mentionFacet);
				html.push(
					`<a href="https://bsky.app/profile/${segment.text.split("@")[1]}">${segment.text}</a>`,
				);
			}
		} else if (segment.isMention()) {
			console.log(segment);
			html.push(
				`<a href="https://bsky.app/profile/${segment.text.split("@")[1]}">${segment.text}</a>`,
			);
		} else {
			html.push(segment.text);
		}
	}
	return html.join("");
};
