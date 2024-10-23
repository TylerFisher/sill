import { createRestAPIClient, type mastodon } from "masto";
import { uuidv7 } from "uuidv7-js";
import { and, eq } from "drizzle-orm";
import { db } from "~/drizzle/db.server";
import {
	actor,
	link,
	linkPost,
	linkPostToUser,
	mastodonAccount,
	post,
	postType,
	post as schemaPost,
} from "~/drizzle/schema.server";

const REDIRECT_URI = process.env.REDIRECT_URI as string; // e.g., 'http://localhost:3000/auth
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
 * Mastodon does not return reblogs in the home timeline if you follow the original poster.
 * This function fetches reblogs for a given status.
 * @param client Masto.js client
 * @param status Original status to search for reblogs
 * @returns List of reblogs for the original status
 */
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

			if (status.reblogsCount > 0) {
				const rebloggedPosts = await fetchRebloggedPosts(client, status);
				timeline.push(...rebloggedPosts);
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
			handle: original.account.username,
			url: original.account.url,
			avatarUrl: original.account.avatar,
		},
	];

	if (t.reblog) {
		actors.push({
			id: uuidv7(),
			handle: t.account.username,
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
		actorHandle: original.account.username,
		repostHandle: t.reblog ? t.account.username : undefined,
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

	return {
		actors,
		post,
		link,
		newLinkPost,
	};
};

/**
 * Gets Mastodon timeline, processes posts, and inserts data into database
 * @param userId ID for logged in user
 * @returns void
 */
export const getLinksFromMastodon = async (userId: string) => {
	const timeline = await getMastodonTimeline(userId);
	const linksOnly = timeline.filter((t) => t.card || t.reblog?.card);
	const processedResults = (
		await Promise.all(linksOnly.map((t) => processMastodonLink(userId, t)))
	).filter((p) => p !== null);

	if (processedResults.length === 0) {
		return null;
	}

	const actors = processedResults.flatMap((p) => p.actors);
	const posts = processedResults.map((p) => p.post);
	const links = processedResults.map((p) => p.link);
	const linkPosts = processedResults.map((p) => p.newLinkPost);

	await db.transaction(async (tx) => {
		if (actors.length > 0)
			await tx.insert(actor).values(actors).onConflictDoNothing();
		if (posts.length > 0)
			await tx.insert(post).values(posts).onConflictDoNothing();
		if (links.length > 0)
			await tx.insert(link).values(links).onConflictDoNothing();
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
