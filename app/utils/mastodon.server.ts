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

const CLIENT_ID = process.env.MASTODON_CLIENT_ID;
const CLIENT_SECRET = process.env.MASTODON_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI as string; // e.g., 'http://localhost:3000/auth
const ONE_DAY_MS = 86400000; // 24 hours in milliseconds

export const getAuthorizationUrl = (instance: string) => {
	return `${instance}/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&instance=${encodeURIComponent(instance)}`;
};

export const getAccessToken = async (instance: string, code: string) => {
	const response = await fetch(`${instance}/oauth/token`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			client_id: CLIENT_ID,
			client_secret: CLIENT_SECRET,
			redirect_uri: REDIRECT_URI,
			code,
			grant_type: "authorization_code",
		}),
	});
	return response.json(); // This will include access_token, token_type, etc.
};

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

	const account = await db.query.mastodonAccount.findFirst({
		where: eq(mastodonAccount.userId, userId),
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
		await db
			.update(mastodonAccount)
			.set({
				mostRecentPostId: timeline[0].id,
			})
			.where(eq(mastodonAccount.id, account.id));
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
	if (card.url === "https://www.youtube.com/undefined") {
		const regex =
			/(https:\/\/(?:www\.youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+(?:<[^>]+>)*[\w-]+(?:\?(?:[\w-=&]+(?:<[^>]+>)*[\w-=&]+)?)?)/g;
		const youtubeUrls = original.content.match(regex);
		if (youtubeUrls) {
			card.url = youtubeUrls[0];
		}
	}

	// Do we know about this post?
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
					eq(linkPost.linkUrl, card.url),
					eq(linkPost.postId, existingPost.id),
				),
				columns: { id: true },
			});

			return {
				linkPost: existingLinkPost,
			};
		}
	});

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

	const post = {
		id: uuidv7(),
		url,
		text: original.content,
		postDate: new Date(original.createdAt),
		postType: postType.enumValues[1],
		actorHandle: original.account.username,
		repostHandle: t.reblog ? t.account.username : undefined,
	};

	const link = {
		id: uuidv7(),
		url: card.url,
		title: card.title,
		description: card.description,
		imageUrl: card.image,
	};

	const newLinkPost = {
		id: uuidv7(),
		linkUrl: card.url,
		postId: post.id,
		date: new Date(original.createdAt),
	};

	return {
		actors,
		post,
		link,
		newLinkPost,
	};
};

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
