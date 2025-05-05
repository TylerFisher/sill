import {
	and,
	desc,
	eq,
	gte,
	ilike,
	isNull,
	notIlike,
	or,
	sql,
	getTableColumns,
	type SQL,
	notInArray,
	not,
	ne,
} from "drizzle-orm";
import { db } from "~/drizzle/db.server";
import {
	link,
	linkPostDenormalized,
	list,
	mutePhrase,
	networkTopTenView,
	getUniqueActorsCountSql,
	postType,
} from "~/drizzle/schema.server";
import { getLinksFromBluesky } from "~/utils/bluesky.server";
import { getLinksFromMastodon } from "~/utils/mastodon.server";
import {
	getTableConfig,
	type PgTable,
	type PgUpdateSetSource,
} from "drizzle-orm/pg-core";
import type { NotificationQuery } from "~/components/forms/NotificationQueryItem";

const PAGE_SIZE = 10;

/**
 * Type for the returned most recent link posts query
 */
export type MostRecentLinkPosts = {
	uniqueActorsCount: number;
	link: typeof link.$inferSelect | null;
	posts?: (typeof linkPostDenormalized.$inferSelect)[];
};

export interface ProcessedResult {
	link: typeof link.$inferInsert;
	denormalized: typeof linkPostDenormalized.$inferInsert;
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
export const getMutePhrases = async (userId: string) => {
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
	// Process in chunks of 1000
	for (let i = 0; i < processedResults.length; i += 1000) {
		const chunk = processedResults.slice(i, i + 1000);

		const MAX_URL_LENGTH = 2712;
		const links = Object.values(
			chunk.reduce(
				(acc, p) => {
					// Remove null bytes from URL and other string fields
					p.link.url = p.link.url.replace(/\0/g, "");
					if (p.link.title) p.link.title = p.link.title.replace(/\0/g, "");
					if (p.link.description)
						p.link.description = p.link.description.replace(/\0/g, "");
					if (p.link.imageUrl)
						p.link.imageUrl = p.link.imageUrl.replace(/\0/g, "");
					if (p.link.giftUrl)
						p.link.giftUrl = p.link.giftUrl.replace(/\0/g, "");

					// Check if URL is too long and warn
					if (p.link.url.length > MAX_URL_LENGTH) {
						console.warn(
							`URL too long for index (${p.link.url.length} bytes): ${p.link.url}`,
						);
						delete acc[p.link.url]; // Remove the link from accumulator if it exists
						return acc;
					}

					const existing = acc[p.link.url];
					if (
						!existing ||
						(p.link.title && !existing.title) ||
						(p.link.title && existing.title === "Main link in OG tweet") || // handle news-feed.bsky.social bs
						(p.link.description && !existing.description) ||
						(p.link.imageUrl && !existing.imageUrl) ||
						(p.link.giftUrl && !existing.giftUrl)
					) {
						acc[p.link.url] = {
							...p.link,
							giftUrl: existing?.giftUrl || p.link.giftUrl,
						};
					}
					return acc;
				},
				{} as Record<string, (typeof processedResults)[0]["link"]>,
			),
		);

		const denormalized = chunk
			.map((p) => p.denormalized)
			.filter((p) => p.linkUrl.length <= MAX_URL_LENGTH)
			.filter((p) => p.postDate >= new Date(Date.now() - ONE_DAY_MS));

		await db.transaction(async (tx) => {
			if (links.length > 0)
				await tx
					.insert(link)
					.values(links)
					.onConflictDoUpdate({
						target: [link.url],
						set: {
							...conflictUpdateSetAllColumns(link),
							giftUrl: sql`CASE 
                WHEN ${link.giftUrl} IS NULL THEN excluded."giftUrl"
                ELSE ${link.giftUrl} 
              END`,
						},
					});

			if (denormalized.length > 0)
				await tx
					.insert(linkPostDenormalized)
					.values(denormalized)
					.onConflictDoNothing();
		});
	}
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
	selectedList?: string;
	limit?: number;
	url?: string;
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
	selectedList = "all",
	limit = PAGE_SIZE,
	url = undefined,
}: FilterArgs) => {
	if (fetch) {
		try {
			const results = await fetchLinks(userId);
			await insertNewLinks(results);
		} catch (e) {
			console.error(e);
		}
	}

	let listRecord: typeof list.$inferSelect | undefined;
	if (selectedList !== "all") {
		listRecord = await db.query.list.findFirst({
			where: eq(list.id, selectedList),
		});
	}

	const offset = (page - 1) * PAGE_SIZE;
	const start = new Date(Date.now() - time);
	const mutePhrases = await getMutePhrases(userId);
	const urlMuteClauses = mutePhrases.flatMap((phrase) => [
		notIlike(link.url, `%${phrase.phrase}%`),
		notIlike(link.title, `%${phrase.phrase}%`),
		notIlike(link.description, `%${phrase.phrase}%`),
	]);
	const postMuteCondition =
		mutePhrases.length > 0
			? sql`CASE WHEN ${or(
					...mutePhrases.flatMap((phrase) => [
						ilike(linkPostDenormalized.postText, `%${phrase.phrase}%`),
						ilike(linkPostDenormalized.postUrl, `%${phrase.phrase}%`),
						ilike(linkPostDenormalized.actorName, `%${phrase.phrase}%`),
						ilike(linkPostDenormalized.actorHandle, `%${phrase.phrase}%`),
						ilike(linkPostDenormalized.quotedPostText, `%${phrase.phrase}%`),
						ilike(linkPostDenormalized.quotedActorName, `%${phrase.phrase}%`),
						ilike(linkPostDenormalized.quotedActorHandle, `%${phrase.phrase}%`),
						ilike(linkPostDenormalized.repostActorName, `%${phrase.phrase}%`),
						ilike(linkPostDenormalized.repostActorHandle, `%${phrase.phrase}%`),
					]),
				)} THEN NULL ELSE 1 END`
			: sql`1`;

	return await db
		.select({
			link,
			// Count unique actors based on similar handles or names, excluding duplicates from different networks
			uniqueActorsCount:
				getUniqueActorsCountSql(postMuteCondition).as("uniqueActorsCount"),
			mostRecentPostDate: sql<Date>`max(${linkPostDenormalized.postDate})`.as(
				"mostRecentPostDate",
			),
		})
		.from(linkPostDenormalized)
		.leftJoin(link, eq(linkPostDenormalized.linkUrl, link.url))
		.where(
			and(
				eq(linkPostDenormalized.userId, userId),
				gte(linkPostDenormalized.postDate, start),
				url ? eq(link.url, url) : undefined,
				listRecord ? eq(linkPostDenormalized.listId, listRecord.id) : undefined,
				...urlMuteClauses,
				service !== "all"
					? eq(linkPostDenormalized.postType, service)
					: undefined,
				hideReposts
					? isNull(linkPostDenormalized.repostActorHandle)
					: undefined,
				query
					? or(
							ilike(link.title, `%${query}%`),
							ilike(link.description, `%${query}%`),
							ilike(link.url, `%${query}%`),
							ilike(linkPostDenormalized.postText, `%${query}%`),
							ilike(linkPostDenormalized.actorName, `%${query}%`),
							ilike(linkPostDenormalized.actorHandle, `%${query}%`),
							ilike(linkPostDenormalized.quotedPostText, `%${query}%`),
							ilike(linkPostDenormalized.quotedActorName, `%${query}%`),
							ilike(linkPostDenormalized.quotedActorHandle, `%${query}%`),
							ilike(linkPostDenormalized.repostActorName, `%${query}%`),
							ilike(linkPostDenormalized.repostActorHandle, `%${query}%`),
						)
					: undefined,
			),
		)
		.groupBy(linkPostDenormalized.linkUrl, link.id)
		.having(sql`count(*) > 0`)
		.orderBy(
			sort === "popularity"
				? desc(sql`"uniqueActorsCount"`)
				: desc(sql`"mostRecentPostDate"`),
			desc(sql`"mostRecentPostDate"`),
		)
		.limit(limit)
		.offset(offset)
		.then(async (results) => {
			const postsPromise = results.map(async (result) => {
				const posts = await db
					.select()
					.from(linkPostDenormalized)
					.where(
						and(
							eq(linkPostDenormalized.linkUrl, result.link?.url || ""),
							eq(linkPostDenormalized.userId, userId),
							gte(linkPostDenormalized.postDate, start),
							sql`${postMuteCondition} = 1`,
							listRecord
								? eq(linkPostDenormalized.listId, listRecord.id)
								: undefined,
							service !== "all"
								? eq(linkPostDenormalized.postType, service)
								: undefined,
							hideReposts
								? isNull(linkPostDenormalized.repostActorHandle)
								: undefined,
							query
								? or(
										ilike(linkPostDenormalized.postText, `%${query}%`),
										ilike(linkPostDenormalized.actorName, `%${query}%`),
										ilike(linkPostDenormalized.actorHandle, `%${query}%`),
										ilike(linkPostDenormalized.quotedPostText, `%${query}%`),
										ilike(linkPostDenormalized.quotedActorName, `%${query}%`),
										ilike(linkPostDenormalized.quotedActorHandle, `%${query}%`),
										ilike(linkPostDenormalized.repostActorName, `%${query}%`),
										ilike(linkPostDenormalized.repostActorHandle, `%${query}%`),
									)
								: undefined,
						),
					)
					.orderBy(desc(linkPostDenormalized.postDate));
				return {
					...result,
					posts,
				};
			});
			return Promise.all(postsPromise);
		});
};

export const evaluateNotifications = async (
	userId: string,
	queries: NotificationQuery[],
	seenLinks: string[] = [],
	createdAt?: Date,
) => {
	const start = createdAt
		? new Date(Math.max(createdAt.getTime(), Date.now() - ONE_DAY_MS))
		: new Date(Date.now() - ONE_DAY_MS);
	const mutePhrases = await getMutePhrases(userId);
	const urlMuteClauses = mutePhrases.flatMap((phrase) => [
		notIlike(link.url, `%${phrase.phrase}%`),
		notIlike(link.title, `%${phrase.phrase}%`),
		notIlike(link.description, `%${phrase.phrase}%`),
	]);
	const postMuteCondition =
		mutePhrases.length > 0
			? sql`CASE WHEN ${or(
					...mutePhrases.flatMap((phrase) => [
						ilike(linkPostDenormalized.postText, `%${phrase.phrase}%`),
						ilike(linkPostDenormalized.postUrl, `%${phrase.phrase}%`),
						ilike(linkPostDenormalized.actorName, `%${phrase.phrase}%`),
						ilike(linkPostDenormalized.actorHandle, `%${phrase.phrase}%`),
						ilike(linkPostDenormalized.quotedPostText, `%${phrase.phrase}%`),
						ilike(linkPostDenormalized.quotedActorName, `%${phrase.phrase}%`),
						ilike(linkPostDenormalized.quotedActorHandle, `%${phrase.phrase}%`),
						ilike(linkPostDenormalized.repostActorName, `%${phrase.phrase}%`),
						ilike(linkPostDenormalized.repostActorHandle, `%${phrase.phrase}%`),
					]),
				)} THEN NULL ELSE 1 END`
			: sql`1`;

	const linkSQLQueries: (SQL | undefined)[] = [];
	const postSQLQueries: (SQL | undefined)[] = [];
	for (const query of queries) {
		if (query.category.id === "url" && typeof query.value === "string") {
			if (query.operator === "equals") {
				linkSQLQueries.push(eq(link.url, query.value));
			}
			if (query.operator === "contains") {
				linkSQLQueries.push(ilike(link.url, `%${query.value}%`));
			}
			if (query.operator === "excludes") {
				linkSQLQueries.push(notIlike(link.url, `%${query.value}%`));
			}
		}

		if (query.category.id === "link" && typeof query.value === "string") {
			if (query.operator === "equals") {
				linkSQLQueries.push(
					or(eq(link.title, query.value), eq(link.description, query.value)),
				);
			}
			if (query.operator === "contains") {
				linkSQLQueries.push(
					or(
						ilike(link.title, `%${query.value}%`),
						ilike(link.description, `%${query.value}%`),
					),
				);
			}
			if (query.operator === "excludes") {
				linkSQLQueries.push(
					and(
						notIlike(link.title, `%${query.value}%`),
						notIlike(link.description, `%${query.value}%`),
					),
				);
			}
		}

		if (query.category.id === "post" && typeof query.value === "string") {
			if (query.operator === "equals") {
				postSQLQueries.push(eq(linkPostDenormalized.postText, query.value));
			}
			if (query.operator === "contains") {
				postSQLQueries.push(
					ilike(linkPostDenormalized.postText, `%${query.value}%`),
				);
			}
			if (query.operator === "excludes") {
				postSQLQueries.push(
					notIlike(linkPostDenormalized.postText, `%${query.value}%`),
				);
			}
		}

		if (query.category.id === "author" && typeof query.value === "string") {
			if (query.operator === "equals") {
				postSQLQueries.push(
					or(
						eq(linkPostDenormalized.actorName, query.value),
						eq(linkPostDenormalized.actorHandle, query.value),
					),
				);
			}
			if (query.operator === "contains") {
				postSQLQueries.push(
					or(
						ilike(linkPostDenormalized.actorName, `%${query.value}%`),
						ilike(linkPostDenormalized.actorHandle, `%${query.value}%`),
					),
				);
			}
			if (query.operator === "excludes") {
				postSQLQueries.push(
					or(
						notIlike(linkPostDenormalized.actorName, `%${query.value}%`),
						notIlike(linkPostDenormalized.actorHandle, `%${query.value}%`),
					),
				);
			}
		}

		if (query.category.id === "list" && typeof query.value === "string") {
			if (query.operator === "equals") {
				postSQLQueries.push(eq(linkPostDenormalized.listId, query.value));
			}
			if (query.operator === "excludes") {
				postSQLQueries.push(
					or(
						ne(linkPostDenormalized.listId, query.value),
						isNull(linkPostDenormalized.listId),
					),
				);
			}
		}
		if (query.category.id === "repost" && typeof query.value === "string") {
			if (query.operator === "equals") {
				postSQLQueries.push(
					or(
						eq(linkPostDenormalized.repostActorName, query.value),
						eq(linkPostDenormalized.repostActorHandle, query.value),
					),
				);
			}
			if (query.operator === "contains") {
				postSQLQueries.push(
					or(
						ilike(linkPostDenormalized.repostActorName, `%${query.value}%`),
						ilike(linkPostDenormalized.repostActorHandle, `%${query.value}%`),
					),
				);
			}
			if (query.operator === "excludes") {
				postSQLQueries.push(
					and(
						notIlike(linkPostDenormalized.repostActorName, `%${query.value}%`),
						notIlike(
							linkPostDenormalized.repostActorHandle,
							`%${query.value}%`,
						),
					),
				);
			}
		}
		if (query.category.id === "service" && typeof query.value === "string") {
			if (query.operator === "equals") {
				const value = postType.enumValues.find((v) => v === query.value);
				if (value) {
					postSQLQueries.push(eq(linkPostDenormalized.postType, value));
				}
			}
			if (query.operator === "excludes") {
				const value = postType.enumValues.find((v) => v === query.value);
				if (value) {
					postSQLQueries.push(ne(linkPostDenormalized.postType, value));
				}
			}
		}
	}

	const sharesQuery = queries.find(
		(query) =>
			query.category.id === "shares" && typeof query.value === "number",
	);

	return await db
		.select({
			link,
			uniqueActorsCount:
				getUniqueActorsCountSql(postMuteCondition).as("uniqueActorsCount"),
			mostRecentPostDate: sql<Date>`max(${linkPostDenormalized.postDate})`.as(
				"mostRecentPostDate",
			),
		})
		.from(linkPostDenormalized)
		.leftJoin(link, eq(linkPostDenormalized.linkUrl, link.url))
		.where(
			and(
				eq(linkPostDenormalized.userId, userId),
				gte(linkPostDenormalized.postDate, start),
				notInArray(link.url, seenLinks),
				...urlMuteClauses,
				...linkSQLQueries,
				...postSQLQueries,
			),
		)
		.groupBy(linkPostDenormalized.linkUrl, link.id)
		.having(
			sharesQuery
				? gte(getUniqueActorsCountSql(postMuteCondition), sharesQuery.value)
				: sql`count(*) > 0`,
		)
		.orderBy(desc(sql`"uniqueActorsCount"`), desc(sql`"mostRecentPostDate"`))
		.then(async (results) => {
			const postsPromise = results.map(async (result) => {
				const posts = await db
					.select()
					.from(linkPostDenormalized)
					.where(
						and(
							eq(linkPostDenormalized.linkUrl, result.link?.url || ""),
							eq(linkPostDenormalized.userId, userId),
							gte(linkPostDenormalized.postDate, start),
							sql`${postMuteCondition} = 1`,
						),
					)
					.orderBy(desc(linkPostDenormalized.postDate));
				return {
					...result,
					posts,
				};
			});
			return Promise.all(postsPromise);
		});
};
interface TopTenLinks {
	link: typeof link.$inferSelect;
	mostRecentPostDate: Date;
	uniqueActorsCount: number;
	post: typeof linkPostDenormalized.$inferSelect | undefined;
}

export interface TopTenResults {
	uniqueActorsCount: number;
	link: typeof link.$inferSelect | null;
	posts?: (typeof linkPostDenormalized.$inferSelect & { count: number })[];
	mostRecentPostDate: Date;
}

export const networkTopTen = async (): Promise<TopTenResults[]> => {
	const start = new Date(Date.now() - 10800000);

	const topTen = await db
		.select()
		.from(networkTopTenView)
		.then(async (results) => {
			const postsPromise = results.map(async (result) => {
				const post = await db
					.select({
						...getTableColumns(linkPostDenormalized),
						count:
							sql<number>`count(*) OVER (PARTITION BY ${linkPostDenormalized.postUrl})`.as(
								"count",
							),
					})
					.from(linkPostDenormalized)
					.where(
						and(
							eq(linkPostDenormalized.linkUrl, result.link?.url || ""),
							gte(linkPostDenormalized.postDate, start),
						),
					)
					.orderBy(desc(sql`count`))
					.limit(1)
					.then((posts) => posts[0]);
				return {
					...result,
					posts: [post],
				};
			});
			return Promise.all(postsPromise);
		});
	return topTen;
};
