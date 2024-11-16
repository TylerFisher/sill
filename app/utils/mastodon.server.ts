import { and, eq } from "drizzle-orm";
import { createRestAPIClient, type mastodon } from "masto";
import { uuidv7 } from "uuidv7-js";
import { db } from "~/drizzle/db.server";
import {
	linkPost,
	linkPostToUser,
	mastodonAccount,
	postType,
	post as schemaPost,
} from "~/drizzle/schema.server";
import type { ProcessedResult } from "./links.server";

const REDIRECT_URI = process.env.MASTODON_REDIRECT_URI as string;
const ONE_DAY_MS = 86400000; // 24 hours in milliseconds

/**
 * Constructs the authorization URL for a given Mastodon instance
 * @param instance Mastodon instance URL
 * @returns Authorization URL for the Mastodon instance
 */
export const getAuthorizationUrl = (instance: string, clientId: string) => {
	return `https://${instance}/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&instance=${encodeURIComponent(instance)}`;
};

/**
 * Fetches the OAuth token from a Mastodon instance given an authorization code
 * @param instance Mastodon instance URL
 * @param code Authorization code
 * @returns OAuth token data
 */
export const getAccessToken = async (
	instance: string,
	code: string,
	clientId: string,
	clientSecret: string,
) => {
	const response = await fetch(`https://${instance}/oauth/token`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			client_id: clientId,
			client_secret: clientSecret,
			redirect_uri: REDIRECT_URI,
			code,
			grant_type: "authorization_code",
		}),
	});
	return await response.json(); // This will include access_token, token_type, etc.
};

/**
 * Fetches the Mastodon timeline for a given user
 * Either fetches all statuses since the last fetch, or all statuses from the last 24 hours
 * @param userId ID for the logged-in user
 * @returns List of statuses from the user's Mastodon timeline since last fetch
 */
export const getMastodonTimeline = async (userId: string) => {
	const yesterday = new Date(Date.now() - ONE_DAY_MS);

	const account = await db.query.mastodonAccount.findFirst({
		where: eq(mastodonAccount.userId, userId),
		with: {
			mastodonInstance: true,
		},
	});

	if (!account) return [];

	const client = createRestAPIClient({
		url: `https://${account.mastodonInstance.instance}`,
		accessToken: account.accessToken,
	});

	const profile = await client.v1.accounts.verifyCredentials();

	const timeline: mastodon.v1.Status[] = [];
	let ended = false;
	for await (const statuses of client.v1.timelines.home.list({
		sinceId: account.mostRecentPostId,
		limit: 40,
	})) {
		if (ended) break;
		for await (const status of statuses) {
			if (status.account.username === profile.username) continue;
			if (status.reblog?.account.username === profile.username) continue;

			// Don't use flipboard or reposts as yesterday check
			if (
				new Date(status.createdAt) <= yesterday &&
				status.account.acct.split("@")[1] !== "flipboard.com" &&
				!status.reblog
			) {
				ended = true;
				break;
			}
			if (status.id === account.mostRecentPostId) {
				ended = true;
				break;
			}

			timeline.push(status);
		}
	}

	if (timeline.length > 0) {
		await db
			.update(mastodonAccount)
			.set({
				mostRecentPostId: timeline[0].id,
			})
			.where(eq(mastodonAccount.id, account.id));
	}

	return timeline;
};

/**
 * Searches for YouTube URLs in the content of a Mastodon post
 * Mastodon returns broken preview cards for YouTube URLs, so this is a workaround
 * @param content Content from the Mastodon post
 * @returns Youtube URL or null
 */
const getYoutubeUrl = async (content: string): Promise<string | null> => {
	const regex =
		/(https:\/\/(?:www\.youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+(?:<[^>]+>)*[\w-]+(?:\?(?:[\w-=&]+(?:<[^>]+>)*[\w-=&]+)?)?)/g;
	const youtubeUrls = content.match(regex);
	return youtubeUrls ? youtubeUrls[0] : null;
};

const getLinkPostSearch = async (
	url: string,
	cardUrl: string,
	t: mastodon.v1.Status,
) => {
	const linkPostSearch = await db.transaction(async (tx) => {
		const existingPost = await tx.query.post.findFirst({
			where: and(
				eq(schemaPost.url, url),
				t.reblog ? eq(schemaPost.repostHandle, t.account.username) : undefined,
			),
			columns: {
				id: true,
			},
		});

		if (existingPost) {
			const existingLinkPost = await tx.query.linkPost.findFirst({
				where: and(
					eq(linkPost.linkUrl, cardUrl),
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
 * Gets actors for a Mastodon post, including reposters
 * @param original Original Mastodon status
 * @param t Mastodon status in the timeline
 * @returns All actors needed for the post in the database
 */
const getActors = async (
	original: mastodon.v1.Status,
	t: mastodon.v1.Status,
) => {
	const actors = [
		{
			id: uuidv7(),
			name: original.account.displayName,
			handle: original.account.acct,
			url: original.account.url,
			avatarUrl: original.account.avatar,
		},
	];

	if (t.reblog) {
		actors.push({
			id: uuidv7(),
			handle: t.account.acct,
			url: t.account.url,
			name: t.account.displayName,
			avatarUrl: t.account.avatar,
		});
	}

	return actors;
};

/**
 * Formats a Mastodon status into a post for the database
 * @param original Original Mastodon status
 * @param t Mastodon status in the timeline
 * @param url URL for the Mastodon status
 * @returns Post object for the database
 */
const createPost = async (
	original: mastodon.v1.Status,
	t: mastodon.v1.Status,
	url: string,
) => {
	return {
		id: uuidv7(),
		url,
		text: original.content,
		postDate: new Date(original.createdAt),
		postType: postType.enumValues[1],
		actorHandle: original.account.acct,
		repostHandle: t.reblog ? t.account.acct : undefined,
	};
};

/**
 * Formats a Mastodon preview card into a link for the database
 * @param card Preview card from Mastodon status
 * @returns Link object for the database
 */
const createLink = async (card: mastodon.v1.PreviewCard) => {
	return {
		id: uuidv7(),
		url: card.url,
		title: card.title,
		description: card.description,
		imageUrl: card.image,
	};
};

/**
 * Formats a Mastodon status into a link post for the database
 * @param card Preview card from Mastodon status
 * @param postId ID of post to be created in database
 * @param createdAt Creation date of the post
 * @returns LinkPost object for the database
 */
const createNewLinkPost = async (
	card: mastodon.v1.PreviewCard,
	postId: string,
	createdAt: string,
) => {
	return {
		id: uuidv7(),
		linkUrl: card.url,
		postId,
		date: new Date(createdAt),
	};
};

/**
 * Processes a post from Mastodon timeline to detect links and prepares data for database insertion
 * @param userId ID for logged in user
 * @param t Status object from Mastodon timeline
 * @returns Actors, post, link, and new link post to insert into database
 */
const processMastodonLink = async (userId: string, t: mastodon.v1.Status) => {
	const original = t.reblog || t;
	const url = original.url;
	const card = original.card;

	if (!url || !card) {
		return null;
	}

	if (card.url === "https://www.youtube.com/undefined") {
		const youtubeUrl = await getYoutubeUrl(original.content);
		if (youtubeUrl) {
			card.url = youtubeUrl;
		}
	}

	// Do we know about this post?
	const linkPostSearch = await getLinkPostSearch(url, card.url, t);

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

	const actors = await getActors(original, t);
	const post = await createPost(original, t, url);
	const link = await createLink(card);
	const newLinkPost = await createNewLinkPost(
		card,
		post.id,
		original.createdAt,
	);
	const newLinkPostToUser = {
		userId,
		linkPostId: newLinkPost.id,
	};

	return {
		actors,
		post,
		link,
		newLinkPost,
		newLinkPostToUser,
	};
};

/**
 * Gets Mastodon timeline and processes posts
 * @param userId ID for logged in user
 * @returns Processed results for database insertion
 */
export const getLinksFromMastodon = async (
	userId: string,
): Promise<ProcessedResult[]> => {
	const timeline = await getMastodonTimeline(userId);
	const linksOnly = timeline.filter((t) => t.card || t.reblog?.card);
	const processedResults = (
		await Promise.all(linksOnly.map((t) => processMastodonLink(userId, t)))
	).filter((p) => p !== null);

	return processedResults;
};
