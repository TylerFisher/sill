import {
	Agent,
	AppBskyEmbedExternal,
	AppBskyEmbedImages,
	AppBskyEmbedRecord,
	AppBskyEmbedRecordWithMedia,
	AppBskyFeedDefs,
	AppBskyFeedPost,
	AppBskyRichtextFacet,
	RichText,
} from "@atproto/api";
import type { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import {
	OAuthResponseError,
	type OAuthSession,
} from "@atproto/oauth-client-node";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7-js";
import { db } from "~/drizzle/db.server";
import { blueskyAccount, link, list, postType } from "~/drizzle/schema.server";
import { createOAuthClient } from "~/server/oauth/client";
import {
	conflictUpdateSetAllColumns,
	type ProcessedResult,
} from "./links.server";
import ogs from "open-graph-scraper";
import type { ListOption } from "~/components/forms/ListSwitch";
import { normalizeLink } from "./normalizeLink";
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

export const getBlueskyList = async (
	agent: Agent,
	dbList: typeof list.$inferSelect,
	accountHandle: string,
) => {
	async function getList(cursor: string | undefined = undefined) {
		// biome-ignore lint/suspicious/noImplicitAnyLet:
		let response;
		if (dbList.uri.includes("app.bsky.graph.list")) {
			response = await agent.app.bsky.feed.getListFeed({
				list: dbList.uri,
				limit: 100,
				cursor,
			});
		} else if (dbList.uri.includes("app.bsky.feed.generator")) {
			response = await agent.app.bsky.feed.getFeed({
				feed: dbList.uri,
				limit: 100,
				cursor,
			});
		}

		if (!response) {
			return [];
		}

		const list = response.data.feed;
		const checkDate = dbList.mostRecentPostDate
			? dbList.mostRecentPostDate
			: new Date(Date.now() - ONE_DAY_MS);

		let reachedEnd = false;
		const newPosts: AppBskyFeedDefs.FeedViewPost[] = [];
		for (const item of list) {
			if (item.post.author.handle === accountHandle) continue;
			if (
				AppBskyFeedDefs.isReasonRepost(item.reason) &&
				item.reason.by.handle === accountHandle
			)
				continue;

			const postDate = AppBskyFeedDefs.isReasonRepost(item.reason)
				? new Date(item.reason.indexedAt)
				: new Date(item.post.indexedAt);
			if (postDate <= checkDate) {
				reachedEnd = true;
				break;
			}
			newPosts.push(item);
		}

		if (!reachedEnd && response.data.cursor) {
			const nextPosts = await getList(response.data.cursor);
			newPosts.push(...nextPosts);
		}
		return newPosts;
	}

	try {
		const listTimeline = await getList();
		if (listTimeline.length > 0) {
			const firstPost = listTimeline[0];
			await db
				.update(list)
				.set({
					mostRecentPostDate: AppBskyFeedDefs.isReasonRepost(firstPost.reason)
						? new Date(firstPost.reason.indexedAt)
						: new Date(firstPost.post.indexedAt),
				})
				.where(eq(list.uri, dbList.uri));
		}
		return listTimeline;
	} catch (error) {
		console.error("Error fetching Bluesky list", error);
		return [];
	}
};

/**
 * Fetches new posts from Bluesky timeline and updates account with most recent post date.
 * @param userId ID for logged in user
 * @returns New posts from Bluesky timeline
 */
export const getBlueskyTimeline = async (
	account: typeof blueskyAccount.$inferSelect,
	agent: Agent,
) => {
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
		const newPosts: AppBskyFeedDefs.FeedViewPost[] = [];
		for (const item of timeline) {
			if (item.post.author.handle === account?.handle) continue;
			if (
				AppBskyFeedDefs.isReasonRepost(item.reason) &&
				item.reason.by.handle === account?.handle
			)
				continue;

			const postDate = AppBskyFeedDefs.isReasonRepost(item.reason)
				? new Date(item.reason.indexedAt)
				: new Date(item.post.indexedAt);
			if (postDate <= checkDate) {
				reachedEnd = true;
				break;
			}
			newPosts.push(item);
		}

		if (!reachedEnd && response.data.cursor) {
			const nextPosts = await getTimeline(response.data.cursor);
			newPosts.push(...nextPosts);
		}
		return newPosts;
	}

	try {
		const timeline = await getTimeline();
		if (timeline.length > 0) {
			const firstPost = timeline[0];
			await db
				.update(blueskyAccount)
				.set({
					mostRecentPostDate: AppBskyFeedDefs.isReasonRepost(firstPost.reason)
						? new Date(firstPost.reason.indexedAt)
						: new Date(firstPost.post.indexedAt),
				})
				.where(eq(blueskyAccount.id, account.id));
		}
		return timeline;
	} catch (error) {
		console.error("Error fetching Bluesky timeline", error);
		return [];
	}
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
			uri: normalizeLink(externalRecord.external.uri),
			title: externalRecord.external.title,
			description: externalRecord.external.description,
			imageUrl: externalRecord.external.thumb,
		};
	}
	return detectedLink;
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
	listId?: string,
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

	if (detectedLink.uri.includes(".gif")) {
		return null;
	}

	const denormalized = {
		id: uuidv7(),
		postUrl,
		postText: serializeBlueskyPostToHtml(record),
		postDate: new Date(t.post.indexedAt),
		postType: postType.enumValues[0],
		postImages: imageGroup.map((image) => ({
			alt: image.alt,
			url: image.thumb,
		})),
		linkUrl: detectedLink.uri,
		actorHandle: t.post.author.handle,
		actorUrl: `https://bsky.app/profile/${t.post.author.handle}`,
		actorName: t.post.author.displayName,
		actorAvatarUrl: t.post.author.avatar,
		quotedActorHandle: quotedRecord?.author.handle,
		quotedActorUrl: quotedRecord
			? `https://bsky.app/profile/${quotedRecord.author.handle}`
			: undefined,
		quotedActorName: quotedRecord?.author.displayName,
		quotedActorAvatarUrl: quotedRecord?.author.avatar,
		quotedPostUrl: quotedPostUrl,
		quotedPostText: quotedValue
			? serializeBlueskyPostToHtml(quotedValue)
			: undefined,
		quotedPostDate: quotedRecord ? new Date(quotedRecord.indexedAt) : undefined,
		quotedPostImages: quotedImageGroup.map((image) => ({
			alt: image.alt,
			url: image.thumb,
		})),
		quotedPostType: quotedValue ? postType.enumValues[0] : undefined,
		repostActorHandle: AppBskyFeedDefs.isReasonRepost(t.reason)
			? t.reason.by.handle
			: undefined,
		repostActorUrl: AppBskyFeedDefs.isReasonRepost(t.reason)
			? `https://bsky.app/profile/${t.reason.by.handle}`
			: undefined,
		repostActorName: AppBskyFeedDefs.isReasonRepost(t.reason)
			? t.reason.by.displayName
			: undefined,
		repostActorAvatarUrl: AppBskyFeedDefs.isReasonRepost(t.reason)
			? t.reason.by.avatar
			: undefined,
		userId,
		listId,
	};

	const link = {
		id: uuidv7(),
		url: detectedLink.uri,
		title: detectedLink.title || "",
		description: detectedLink.description,
		imageUrl: detectedLink.imageUrl,
	};

	return { link, denormalized };
};

/**
 * Gets Bluesky timeline and processed posts
 * @param userId ID for logged in user
 * @returns Processed posts for database insertion
 */
export const getLinksFromBluesky = async (
	userId: string,
): Promise<ProcessedResult[]> => {
	const account = await db.query.blueskyAccount.findFirst({
		where: eq(blueskyAccount.userId, userId),
		with: {
			lists: true,
		},
	});
	if (!account) return [];

	if (
		account.mostRecentPostDate &&
		account.mostRecentPostDate > new Date(Date.now() - 60000) // only fetch once per minute
	) {
		return [];
	}

	const oauthSession = await handleBlueskyOAuth(account);
	if (!oauthSession) return [];

	const agent = new Agent(oauthSession);
	const timeline = await getBlueskyTimeline(account, agent);

	const processedResults = (
		await Promise.all(timeline.map(async (t) => processBlueskyLink(userId, t)))
	).filter((p) => p !== null);

	for (const list of account.lists) {
		const listPosts = await getBlueskyList(agent, list, account.handle);
		processedResults.push(
			...(
				await Promise.all(
					listPosts.map(async (t) => processBlueskyLink(userId, t, list.id)),
				)
			).filter((p) => p !== null),
		);
	}

	// const linksToFetch = processedResults
	// 	.map((p) => p.link)
	// 	.filter((l) => !l.description)
	// 	.filter(
	// 		(obj1, i, arr) => arr.findIndex((obj2) => obj2.url === obj1.url) === i,
	// 	)
	// 	.filter((l) => {
	// 		const url = new URL(l.url);
	// 		return !url.pathname.endsWith(".pdf");
	// 	});

	return processedResults;
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
					uri: normalizeLink(existingLink.url),
					title: existingLink.title,
					imageUrl: existingLink.imageUrl,
					description: existingLink.description,
				};
			}
			foundLink = {
				uri: normalizeLink(segment.link.uri),
				title: "",
				imageUrl: null,
				description: null,
			};
			break;
		}
	}
	return foundLink;
};

export const processLinks = async (links: (typeof link.$inferInsert)[]) => {
	const metadata = await Promise.all(
		links.map(async (link) => {
			return fetchLinkMetadata(link.url);
		}),
	).then((results) => results.filter((r) => r !== undefined && r !== null));

	await db
		.insert(link)
		.values(metadata)
		.onConflictDoUpdate({
			target: link.url,
			set: conflictUpdateSetAllColumns(link),
		});
};

/**
 * Fetches metadata for a link and inserts it into the database
 * Used by the link metadata fetcher queue in Redis
 * @param uri URI to fetch metadata for
 * @returns void
 */
export const fetchLinkMetadata = async (uri: string) => {
	const url = new URL(uri);
	// The GOVERNMENT OF MANITOBA can't make html
	if (
		url.hostname === "news.gov.mb.ca" ||
		uri === "https://tinyurl.com/jcyff8eh"
	) {
		return {
			id: uuidv7(),
			url: uri,
			title: "",
			description: null,
			imageUrl: null,
		};
	}

	const userAgent =
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";

	try {
		const metadata = await ogs({
			url: uri,
			blacklist: ["news.gov.mb.ca"],
			fetchOptions: {
				headers: {
					"user-agent": userAgent,
				},
			},
		});

		if (metadata.result.success) {
			return {
				id: uuidv7(),
				url: metadata.result.ogUrl || uri,
				title: metadata.result.ogTitle || "",
				description: metadata.result.ogDescription || null,
				imageUrl: metadata.result.ogImage
					? metadata.result.ogImage[0].url
					: null,
			};
		}
	} catch (e) {
		console.error(`Failed to fetch link ${uri}`, e);
	}
};

const serializeBlueskyPostToHtml = (post: AppBskyFeedPost.Record) => {
	const rt = new RichText({
		text: post.text,
		facets: post.facets,
	});
	const html: string[] = [];
	for (const segment of rt.segments()) {
		segment.text = segment.text.replace(/\n/g, "<br />");
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
				html.push(
					`<a href="https://bsky.app/profile/${segment.text.split("@")[1]}">${segment.text}</a>`,
				);
			}
		} else if (segment.isMention()) {
			html.push(
				`<a href="https://bsky.app/profile/${segment.text.split("@")[1]}">${segment.text}</a>`,
			);
		} else {
			html.push(segment.text);
		}
	}
	return html.join("");
};

type BlueskyAccount = typeof blueskyAccount.$inferSelect;
interface AccountWithLists extends BlueskyAccount {
	lists: (typeof list.$inferSelect)[];
}

export const getBlueskyLists = async (account: AccountWithLists) => {
	const listOptions: ListOption[] = [];
	const client = await createOAuthClient();
	const session = await client.restore(account.did);
	const agent = new Agent(session);
	const prefs = await agent.getPreferences();
	const lists = prefs.savedFeeds;
	for (const list of lists) {
		if (list.type === "list") {
			try {
				const listData = await agent.app.bsky.graph.getList({
					list: list.value,
				});
				listOptions.push({
					name: listData.data.list.name,
					uri: listData.data.list.uri,
					type: "bluesky",
					subscribed: account.lists.some(
						(l) => l.uri === listData.data.list.uri,
					),
				});
			} catch (error) {
				console.error("Could not find list", list.value, error);
			}
		} else if (list.type === "feed") {
			try {
				const feedData = await agent.app.bsky.feed.getFeedGenerator({
					feed: list.value,
				});
				listOptions.push({
					name: feedData.data.view.displayName,
					uri: feedData.data.view.uri,
					type: "bluesky",
					subscribed: account.lists.some(
						(l) => l.uri === feedData.data.view.uri,
					),
				});
			} catch (error) {
				console.error("Could not find feed", list.value, error);
			}
		}
	}

	return listOptions;
};
