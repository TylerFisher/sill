import groupBy from "object.groupby";
import {
	and,
	desc,
	eq,
	gte,
	inArray,
	type InferSelectModel,
} from "drizzle-orm";
import { db } from "~/drizzle/db.server";
import { linkPost, linkPostToUser, mutePhrase } from "~/drizzle/schema.server";
import type { InferResultType } from "~/drizzle/types.server";
import { getLinksFromBluesky } from "~/utils/bluesky.server";
import { getLinksFromMastodon } from "~/utils/mastodon.server";
interface LinkOccurrenceArgs {
	userId: string;
	time?: number;
	hideReposts?: boolean;
	sort?: string;
	query?: string | undefined;
	fetch?: boolean;
}

export type MostRecentLinkPosts = InferResultType<
	"linkPost",
	{
		post: {
			with: {
				actor: true;
				quoting: { with: { actor: true; postImages: true } };
				postImages: true;
				reposter: true;
			};
		};
		link: true;
		linkPostToUsers: true;
	}
>;

const DEFAULT_HIDE_REPOSTS = false;
const DEFAULT_SORT = "popularity";
const DEFAULT_QUERY = undefined;
const DEFAULT_FETCH = false;
const ONE_DAY_MS = 86400000; // 24 hours in milliseconds

const fetchLinks = async (userId: string) => {
	return await Promise.all([
		getLinksFromMastodon(userId),
		getLinksFromBluesky(userId),
	]);
};

const getMutePhrases = async (userId: string) => {
	return await db.query.mutePhrase.findMany({
		where: eq(mutePhrase.userId, userId),
	});
};

const getMostRecentLinkPosts = async (userId: string, time: number) => {
	const start = new Date(Date.now() - time);

	return await db.transaction(async (tx) => {
		const linkPostsForUser = await tx.query.linkPostToUser.findMany({
			where: eq(linkPostToUser.userId, userId),
		});

		return await db.query.linkPost.findMany({
			where: and(
				inArray(
					linkPost.id,
					linkPostsForUser.map((lp) => lp.linkPostId),
				),
				gte(linkPost.date, start),
			),
			with: {
				link: true,
				linkPostToUsers: true,
				post: {
					with: {
						actor: true,
						quoting: {
							with: {
								actor: true,
								postImages: true,
							},
						},
						postImages: true,
						reposter: true,
					},
				},
			},
			orderBy: desc(linkPost.date),
		});
	});
};

const filterByQuery = async (
	query: string,
	linkPosts: MostRecentLinkPosts[],
) => {
	const lowerQuery = query.toLowerCase();
	return linkPosts.filter((lp) => {
		return (
			lp.link.title?.toLowerCase().includes(lowerQuery) ||
			lp.link.description?.toLowerCase().includes(lowerQuery) ||
			lp.post.text.toLowerCase().includes(lowerQuery) ||
			lp.post.actor.name?.toLowerCase().includes(lowerQuery) ||
			lp.post.actor.handle.toLowerCase().includes(lowerQuery)
		);
	});
};

const filterByMutePhrases = async (
	mutePhrases: InferSelectModel<typeof mutePhrase>[],
	linkPosts: MostRecentLinkPosts[],
) => {
	return linkPosts.filter((lp) => {
		return !mutePhrases.some((phrase) => {
			return (
				lp.link.title?.toLowerCase().includes(phrase.phrase.toLowerCase()) ||
				lp.link.description
					?.toLowerCase()
					.includes(phrase.phrase.toLowerCase()) ||
				lp.post.text.toLowerCase().includes(phrase.phrase.toLowerCase()) ||
				lp.post.actor.name
					?.toLowerCase()
					.includes(phrase.phrase.toLowerCase()) ||
				lp.post.actor.handle.toLowerCase().includes(phrase.phrase.toLowerCase())
			);
		});
	});
};

const filterByReposts = async (linkPosts: MostRecentLinkPosts[]) => {
	return linkPosts.filter((lp) => !lp.post.reposter);
};

const groupByLink = async (linkPosts: MostRecentLinkPosts[]) => {
	return groupBy(linkPosts, (l) => {
		return l.link.url;
	});
};

const sortByPopularity = async (
	grouped: Record<string, MostRecentLinkPosts[]>,
) => {
	return Object.entries(grouped).sort(
		(a, b) =>
			[
				...new Set(
					b[1].map((l) =>
						l.post.reposter ? l.post.reposter.handle : l.post.actor.handle,
					),
				),
			].length -
			[
				...new Set(
					a[1].map((l) =>
						l.post.reposter ? l.post.reposter.handle : l.post.actor.handle,
					),
				),
			].length,
	);
};

export const countLinkOccurrences = async ({
	userId,
	time = ONE_DAY_MS,
	hideReposts = DEFAULT_HIDE_REPOSTS,
	sort = DEFAULT_SORT,
	query = DEFAULT_QUERY,
	fetch = DEFAULT_FETCH,
}: LinkOccurrenceArgs) => {
	if (fetch) {
		await fetchLinks(userId);
	}
	const mutePhrases = await getMutePhrases(userId);
	let mostRecentLinkPosts = await getMostRecentLinkPosts(userId, time);
	if (query) {
		mostRecentLinkPosts = await filterByQuery(query, mostRecentLinkPosts);
	}
	mostRecentLinkPosts = await filterByMutePhrases(
		mutePhrases,
		mostRecentLinkPosts,
	);
	if (hideReposts) {
		mostRecentLinkPosts = await filterByReposts(mostRecentLinkPosts);
	}
	const grouped = await groupByLink(mostRecentLinkPosts);

	if (sort === "popularity") {
		const sorted = await sortByPopularity(grouped);
		return sorted.slice(0, 20);
	}

	return Object.entries(grouped).slice(0, 20);
};
