import {
	aliasedTable,
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
} from "drizzle-orm";
import { db } from "~/drizzle/db.server";
import {
	actor,
	linkPostDenormalized,
	link,
	linkPost,
	linkPostToUser,
	list,
	mutePhrase,
	post,
	postImage,
	postListSubscription,
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
		// getLinksFromMastodon(userId),
		getLinksFromBluesky(userId),
	]);
	return results[0];
	// return results[1].concat(results[0]);
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

	const denormalized = processedResults.map((p) => p.denormalized);

	await db.transaction(async (tx) => {
		if (links.length > 0)
			await tx
				.insert(link)
				.values(links)
				.onConflictDoUpdate({
					target: [link.url],
					set: conflictUpdateSetAllColumns(link),
				});

		if (denormalized.length > 0)
			await tx
				.insert(linkPostDenormalized)
				.values(denormalized)
				.onConflictDoNothing();
	});

	// const actors = processedResults
	// 	.flatMap((p) => p.actors)
	// 	.filter(
	// 		(obj1, i, arr) =>
	// 			arr.findIndex((obj2) => obj2.handle === obj1.handle) === i,
	// 	);
	// const quotedPosts = processedResults
	// 	.map((p) => p.quotedPost)
	// 	.filter((p) => p !== undefined);
	// const posts = processedResults.map((p) => p.post);

	// const links = Object.values(
	// 	processedResults.reduce(
	// 		(acc, p) => {
	// 			const existing = acc[p.link.url];
	// 			if (
	// 				!existing ||
	// 				(p.link.title && !existing.title) ||
	// 				(p.link.description && !existing.description) ||
	// 				(p.link.imageUrl && !existing.imageUrl)
	// 			) {
	// 				acc[p.link.url] = p.link;
	// 			}
	// 			return acc;
	// 		},
	// 		{} as Record<string, (typeof processedResults)[0]["link"]>,
	// 	),
	// );
	// const linkPosts = processedResults.map((p) => p.newLinkPost);
	// const images = processedResults
	// 	.flatMap((p) => p.images)
	// 	.filter((p) => p !== undefined);
	// const newLinkPostsToUser = processedResults.map((p) => p.newLinkPostToUser);
	// const newPostListSubscriptions = processedResults
	// 	.map((p) => p.newPostListSubscription)
	// 	.filter((p) => p !== undefined);

	// await db.transaction(async (tx) => {
	// 	if (actors.length > 0)
	// 		await tx
	// 			.insert(actor)
	// 			.values(actors)
	// 			.onConflictDoUpdate({
	// 				target: [actor.handle],
	// 				set: conflictUpdateSetAllColumns(actor),
	// 			});
	// 	if (quotedPosts.length > 0)
	// 		await tx.insert(post).values(quotedPosts).onConflictDoNothing();
	// 	if (posts.length > 0)
	// 		await tx.insert(post).values(posts).onConflictDoNothing();
	// 	if (links.length > 0)
	// 		await tx
	// 			.insert(link)
	// 			.values(links)
	// 			.onConflictDoUpdate({
	// 				target: [link.url],
	// 				set: conflictUpdateSetAllColumns(link),
	// 			});
	// 	if (images.length > 0)
	// 		await tx.insert(postImage).values(images).onConflictDoNothing();
	// 	if (linkPosts.length > 0) {
	// 		await tx.insert(linkPost).values(linkPosts).onConflictDoNothing();
	// 	}
	// 	if (newLinkPostsToUser.length > 0) {
	// 		await tx
	// 			.insert(linkPostToUser)
	// 			.values(newLinkPostsToUser)
	// 			.onConflictDoNothing();
	// 	}
	// 	if (newPostListSubscriptions.length > 0) {
	// 		await tx
	// 			.insert(postListSubscription)
	// 			.values(newPostListSubscriptions)
	// 			.onConflictDoNothing();
	// 	}
	// });
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

	const quote = aliasedTable(post, "quote");
	const reposter = aliasedTable(actor, "reposter");
	const quoteActor = aliasedTable(actor, "quoteActor");
	const quoteImage = aliasedTable(postImage, "quoteImage");

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
			uniqueActorsCount: sql<number>`cast(count(distinct 
      CASE WHEN ${postMuteCondition} = 1 
      THEN coalesce(${linkPostDenormalized.repostActorHandle}, ${linkPostDenormalized.actorHandle}) 
      END) as int)`.as("uniqueActorsCount"),
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
				: desc(sql`max(${linkPostDenormalized.postDate})`),
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

	// return await db.transaction(async (tx) => {
	// 	const groupedLinks = tx
	// 		.select({
	// 			url: link.url,
	// 	uniqueActorsCount: sql<number>`cast(count(distinct
	// CASE WHEN ${postMuteCondition} = 1
	// THEN coalesce(${reposter.handle}, ${actor.handle})
	// END) as int)`.as("uniqueActorsCount"),
	// 			posts: sql<PostReturn[]>`json_agg(
	//     CASE WHEN ${postMuteCondition} = 1 THEN
	//     json_build_object(
	//       'post', ${post},
	//       'quote', json_build_object(
	//       'post', ${quote},
	//       'actor', ${quoteActor},
	//       'image', ${quoteImage}
	//       ),
	//       'reposter', ${reposter},
	//       'image', ${postImage},
	//       'actor', ${actor}
	//     )
	//     END
	//     order by ${post.postDate} desc) filter (where ${postMuteCondition} = 1)`.as(
	// 				"posts",
	// 			),
	// 			mostRecentPostDate: sql<Date>`max(${post.postDate})`.as(
	// 				"mostRecentPostDate",
	// 			),
	// 		})
	// 		.from(linkPost)
	// 		.leftJoin(link, eq(linkPost.linkUrl, link.url))
	// 		.leftJoin(linkPostToUser, eq(linkPost.id, linkPostToUser.linkPostId))
	// 		.leftJoin(post, eq(linkPost.postId, post.id))
	// 		.leftJoin(postListSubscription, eq(postListSubscription.postId, post.id))
	// 		.leftJoin(actor, eq(post.actorHandle, actor.handle))
	// 		.leftJoin(quote, eq(post.quotingId, quote.id))
	// 		.leftJoin(reposter, eq(post.repostHandle, reposter.handle))
	// 		.leftJoin(quoteActor, eq(quote.actorHandle, quoteActor.handle))
	// 		.leftJoin(quoteImage, eq(quote.id, quoteImage.postId))
	// 		.leftJoin(postImage, eq(post.id, postImage.postId))
	// 		.where(
	// 			and(
	// 				eq(linkPostToUser.userId, userId),
	// 				gte(post.postDate, start),
	// 				listRecord
	// 					? eq(postListSubscription.listId, listRecord.id)
	// 					: undefined,
	// 				...urlMuteClauses,
	// 				service !== "all" ? eq(post.postType, service) : undefined,
	// 				hideReposts ? isNull(post.repostHandle) : undefined,
	// 				query
	// 					? or(
	// 							ilike(link.title, `%${query}%`),
	// 							ilike(link.description, `%${query}%`),
	// 							ilike(link.url, `%${query}%`),
	// 							ilike(post.text, `%${query}%`),
	// 							ilike(actor.name, `%${query}%`),
	// 							ilike(actor.handle, `%${query}%`),
	// 							ilike(quote.text, `%${query}%`),
	// 							ilike(quoteActor.name, `%${query}%`),
	// 							ilike(quoteActor.handle, `%${query}%`),
	// 							ilike(reposter.name, `%${query}%`),
	// 							ilike(reposter.handle, `%${query}%`),
	// 						)
	// 					: undefined,
	// 			),
	// 		)
	// 		.groupBy(link.url)
	// 		.as("groupedLinks");

	// 	return await tx
	// 		.select({
	// 			uniqueActorsCount: groupedLinks.uniqueActorsCount,
	// 			link,
	// 			posts: groupedLinks.posts,
	// 			mostRecentPostDate: groupedLinks.mostRecentPostDate,
	// 		})
	// 		.from(groupedLinks)
	// 		.leftJoin(link, eq(groupedLinks.url, link.url))
	// 		.orderBy(
	// 			sort === "popularity"
	// 				? desc(groupedLinks.uniqueActorsCount)
	// 				: desc(groupedLinks.mostRecentPostDate),
	// 			desc(groupedLinks.mostRecentPostDate),
	// 		)
	// 		.limit(limit)
	// 		.offset(offset);
	// });
};
