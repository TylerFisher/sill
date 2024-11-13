import {
	aliasedTable,
	and,
	desc,
	eq,
	gte,
	ilike,
	inArray,
	isNull,
	notIlike,
	or,
	sql,
	getTableColumns,
} from "drizzle-orm";
import { db } from "~/drizzle/db.server";
import {
	actor,
	link,
	linkPost,
	linkPostToUser,
	mutePhrase,
	post,
	postImage,
} from "~/drizzle/schema.server";
import { getLinksFromBluesky } from "~/utils/bluesky.server";
import { getLinksFromMastodon } from "~/utils/mastodon.server";
import {
	getTableConfig,
	type PgTable,
	type PgUpdateSetSource,
} from "drizzle-orm/pg-core";

const PAGE_SIZE = 10;

export interface PostReturn {
	post: typeof post.$inferSelect;
	quote: {
		post?: typeof post.$inferSelect;
		actor?: typeof actor.$inferSelect;
		image?: typeof postImage.$inferSelect;
	};
	reposter?: typeof actor.$inferSelect;
	image?: typeof postImage.$inferSelect;
	actor: typeof actor.$inferSelect;
}

/**
 * Type for the returned most recent link posts query
 */
export type MostRecentLinkPosts = {
	uniqueActorsCount: number;
	link: typeof link.$inferSelect | null;
	posts?: PostReturn[];
};

export interface ProcessedResult {
	actors: (typeof actor.$inferInsert)[];
	quotedPost?: typeof post.$inferInsert;
	post: typeof post.$inferInsert;
	link: typeof link.$inferInsert;
	newLinkPost: typeof linkPost.$inferInsert;
	images?: (typeof postImage.$inferInsert)[];
	newLinkPostToUser: typeof linkPostToUser.$inferInsert;
}

/**
 * Fetches links from Mastodon and Bluesky
 * @param userId ID for logged in user
 * @returns All fetched links from Mastodon and Bluesky
 */
export const fetchLinks = async (
	userId: string,
): Promise<ProcessedResult[]> => {
	const results = await Promise.all([
		getLinksFromMastodon(userId),
		getLinksFromBluesky(userId),
	]);
	return results[1].concat(results[0]);
};

/**
 * Retrieves all mute phrases for a user
 * @param userId ID for logged in user
 * @returns All mute phrases for the user
 */
const getMutePhrases = async (userId: string) => {
	return await db.query.mutePhrase.findMany({
		where: eq(mutePhrase.userId, userId),
	});
};

/**
 * Dedupe and insert new links into the database
 * @param processedResults All processed results to insert
 * @param userId ID for logged in user
 */
export const insertNewLinks = async (processedResults: ProcessedResult[]) => {
	const actors = processedResults
		.flatMap((p) => p.actors)
		.filter(
			(obj1, i, arr) =>
				arr.findIndex((obj2) => obj2.handle === obj1.handle) === i,
		);
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
	const images = processedResults
		.flatMap((p) => p.images)
		.filter((p) => p !== undefined);
	const newLinkPostsToUser = processedResults.map((p) => p.newLinkPostToUser);

	await db.transaction(async (tx) => {
		if (actors.length > 0)
			await tx
				.insert(actor)
				.values(actors)
				.onConflictDoUpdate({
					target: [actor.handle],
					set: conflictUpdateSetAllColumns(actor),
				});
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
					set: conflictUpdateSetAllColumns(link),
				});
		if (images.length > 0)
			await tx.insert(postImage).values(images).onConflictDoNothing();
		if (linkPosts.length > 0) {
			await tx.insert(linkPost).values(linkPosts).onConflictDoNothing();
		}
		if (newLinkPostsToUser.length > 0) {
			await tx
				.insert(linkPostToUser)
				.values(newLinkPostsToUser)
				.onConflictDoNothing();
		}
	});
};

export function conflictUpdateSetAllColumns<TTable extends PgTable>(
	table: TTable,
): PgUpdateSetSource<TTable> {
	const columns = getTableColumns(table);
	const { name: tableName } = getTableConfig(table);
	const conflictUpdateSet = Object.entries(columns).reduce(
		(acc, [columnName, columnInfo]) => {
			if (!columnInfo.default && columnInfo.name !== "id") {
				// @ts-ignore
				acc[columnName] = sql.raw(
					`COALESCE(excluded."${columnInfo.name}", ${tableName}."${columnInfo.name}")`,
				);
			}
			return acc;
		},
		{},
	) as PgUpdateSetSource<TTable>;
	return conflictUpdateSet;
}
interface FilterArgs {
	userId: string;
	time?: number;
	hideReposts?: boolean;
	sort?: string;
	query?: string | undefined;
	service?: "mastodon" | "bluesky" | "all";
	page?: number;
	fetch?: boolean;
}

const DEFAULT_HIDE_REPOSTS = false;
const DEFAULT_SORT = "popularity";
const DEFAULT_QUERY = undefined;
const DEFAULT_FETCH = false;
const ONE_DAY_MS = 86400000; // 24 hours in milliseconds

/**
 * Retrieves most recent link posts for a user in a given time frame
 * @param userId ID for logged in user
 * @param time Time in milliseconds to get most recent link posts
 * @returns Most recent link posts for a user in a given time frame
 */
export const filterLinkOccurrences = async ({
	userId,
	time = ONE_DAY_MS,
	hideReposts = DEFAULT_HIDE_REPOSTS,
	sort = DEFAULT_SORT,
	query = DEFAULT_QUERY,
	service = "all",
	page = 1,
	fetch = DEFAULT_FETCH,
}: FilterArgs) => {
	if (fetch) {
		const results = await fetchLinks(userId);
		await insertNewLinks(results);
	}

	const offset = (page - 1) * PAGE_SIZE;
	const start = new Date(Date.now() - time);

	const mutePhrases = await getMutePhrases(userId);
	const muteClauses = mutePhrases.flatMap((phrase) => {
		return [
			notIlike(link.url, `%${phrase.phrase}%`),
			notIlike(link.title, `%${phrase.phrase}%`),
			notIlike(link.description, `%${phrase.phrase}%`),
			notIlike(post.text, `%${phrase.phrase}%`),
			notIlike(actor.name, `%${phrase.phrase}%`),
			notIlike(actor.handle, `%${phrase.phrase}%`),
		];
	});

	const linkPosts = await db.transaction(async (tx) => {
		const linkPostsForUser = await tx.query.linkPostToUser.findMany({
			where: eq(linkPostToUser.userId, userId),
			columns: {
				linkPostId: true,
			},
		});

		const quote = aliasedTable(post, "quote");
		const reposter = aliasedTable(actor, "reposter");
		const quoteActor = aliasedTable(actor, "quoteActor");
		const quoteImage = aliasedTable(postImage, "quoteImage");

		const groupedLinks = tx
			.select({
				url: link.url,
				uniqueActorsCount:
					sql<number>`cast(count(distinct coalesce(${reposter.handle}, ${actor.handle})) as int)`.as(
						"uniqueActorsCount",
					),
				posts: sql<PostReturn[]>`json_agg(json_build_object(
          'post', ${post},
          'quote', json_build_object(
            'post', ${quote},
            'actor', ${quoteActor},
            'image', ${quoteImage}
          ),
          'reposter', ${reposter},
          'image', ${postImage},
          'actor', ${actor}
        ) order by ${post.postDate} desc)`.as("posts"),
				mostRecentPostDate: sql<Date>`max(${post.postDate})`.as(
					"mostRecentPostDate",
				),
			})
			.from(linkPost)
			.leftJoin(link, eq(linkPost.linkUrl, link.url))
			.leftJoin(post, eq(linkPost.postId, post.id))
			.leftJoin(actor, eq(post.actorHandle, actor.handle))
			.leftJoin(quote, eq(post.quotingId, quote.id))
			.leftJoin(reposter, eq(post.repostHandle, reposter.handle))
			.leftJoin(quoteActor, eq(quote.actorHandle, quoteActor.handle))
			.leftJoin(quoteImage, eq(quote.id, quoteImage.postId))
			.leftJoin(postImage, eq(post.id, postImage.postId))
			.where(
				and(
					inArray(
						linkPost.id,
						linkPostsForUser.map((lp) => lp.linkPostId),
					),
					gte(linkPost.date, start),
					...muteClauses,
					service !== "all" ? eq(post.postType, service) : undefined,
					hideReposts ? isNull(post.repostHandle) : undefined,
					query
						? or(
								ilike(link.title, `%${query}%`),
								ilike(link.description, `%${query}%`),
								ilike(link.url, `%${query}%`),
								ilike(post.text, `%${query}%`),
								ilike(actor.name, `%${query}%`),
								ilike(actor.handle, `%${query}%`),
							)
						: undefined,
				),
			)
			.groupBy(link.url)
			.as("groupedLinks");

		return await tx
			.select({
				uniqueActorsCount: groupedLinks.uniqueActorsCount,
				link,
				posts: groupedLinks.posts,
				mostRecentPostDate: groupedLinks.mostRecentPostDate,
			})
			.from(groupedLinks)
			.leftJoin(link, eq(groupedLinks.url, link.url))
			.orderBy(
				sort === "popularity"
					? desc(groupedLinks.uniqueActorsCount)
					: desc(groupedLinks.mostRecentPostDate),
				desc(groupedLinks.mostRecentPostDate),
			)
			.limit(PAGE_SIZE)
			.offset(offset);
	});

	return linkPosts;
};
