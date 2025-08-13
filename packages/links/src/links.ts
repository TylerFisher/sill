import {
  type SQL,
  and,
  desc,
  eq,
  getTableColumns,
  gte,
  ilike,
  isNotNull,
  isNull,
  ne,
  notIlike,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import {
  type PgTable,
  type PgUpdateSetSource,
  getTableConfig,
} from "drizzle-orm/pg-core";
import {
  db,
  getUniqueActorsCountSql,
  link,
  linkPostDenormalized,
  list,
  mutePhrase,
  networkTopTenView,
  postType,
  type NotificationQuery,
} from "@sill/schema";
import { getLinksFromBluesky } from "./bluesky.js";
import { getLinksFromMastodon } from "./mastodon.js";
import {
  type OrderField,
  type QueryContext,
  type WhereCondition,
  createQueryBuilder,
  createQueryEngine,
} from "./query-federation.js";

const PAGE_SIZE = 10;
export interface ProcessedResult {
  link: typeof link.$inferInsert;
  denormalized: typeof linkPostDenormalized.$inferInsert;
}

export type FederatedQueryRow = typeof link.$inferSelect & {
  uniqueactorscount: string;
};

/**
 * Fetches links from Mastodon and/or Bluesky
 * @param userId ID for logged in user
 * @param type Optional service type filter
 * @returns All fetched links from specified service(s)
 */
export const fetchLinks = async (
  userId: string,
  type?: "mastodon" | "bluesky"
): Promise<ProcessedResult[]> => {
  if (type === "mastodon") {
    return await getLinksFromMastodon(userId);
  }
  if (type === "bluesky") {
    return await getLinksFromBluesky(userId);
  }

  // Fetch from both services if no type specified
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
              `URL too long for index (${p.link.url.length} bytes): ${p.link.url}`
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
        {} as Record<string, (typeof processedResults)[0]["link"]>
      )
    );

    const denormalized = chunk
      .map((p) => p.denormalized)
      .filter((p) => p.linkUrl.length <= MAX_URL_LENGTH)
      .filter((p) => new Date(p.postDate) >= new Date(Date.now() - ONE_DAY_MS));

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
  table: TTable
): PgUpdateSetSource<TTable> {
  const columns = getTableColumns(table);
  const { name: tableName } = getTableConfig(table);
  const conflictUpdateSet = Object.entries(columns).reduce(
    (acc, [columnName, columnInfo]) => {
      if (!columnInfo.default && columnInfo.name !== "id") {
        // @ts-ignore
        acc[columnName] = sql.raw(
          `COALESCE(excluded."${columnInfo.name}", ${tableName}."${columnInfo.name}")`
        );
      }
      return acc;
    },
    {}
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
  minShares?: number;
}

const DEFAULT_HIDE_REPOSTS = false;
const DEFAULT_SORT = "popularity";
const DEFAULT_QUERY = undefined;
const DEFAULT_FETCH = false;
const ONE_DAY_MS = 86400000; // 24 hours in milliseconds

/**
 * Retrieves most recent link posts for a user in a given time frame
 * Uses the query federation layer to automatically route queries between PostgreSQL and DuckDB
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
  minShares = undefined,
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
  const end = new Date();
  const mutePhrases = await getMutePhrases(userId);

  // Set up query context for data source routing (PostgreSQL for < 48hrs, DuckDB for older data)
  const queryContext: QueryContext = {
    dateRange: { start, end },
    tableName: "linkPostDenormalized",
    userId,
  };

  // Build where conditions using federation layer (snake_case tables, quoted camelCase columns)
  const whereConditions: WhereCondition[] = [
    { field: 'link_post_denormalized."userId"', operator: "eq", value: userId },
    {
      field: 'link_post_denormalized."postDate"',
      operator: "gte",
      value: start,
    },
  ];

  // Add URL filter if specified
  if (url) {
    whereConditions.push({ field: "link.url", operator: "eq", value: url });
  }

  // Add list filter if specified
  if (listRecord) {
    whereConditions.push({
      field: 'link_post_denormalized."listId"',
      operator: "eq",
      value: listRecord.id,
    });
  }

  // Add service filter
  if (service !== "all") {
    whereConditions.push({
      field: 'link_post_denormalized."postType"',
      operator: "eq",
      value: service,
    });
  }

  // Add repost filter
  if (hideReposts) {
    whereConditions.push({
      field: 'link_post_denormalized."repostActorHandle"',
      operator: "isNull",
    });
  }

  // Add search query filters (simplified - for complex OR logic, extend QueryBuilder)
  if (query) {
    whereConditions.push({
      field: "link.title",
      operator: "ilike",
      value: `%${query}%`,
    });
  }

  // Add mute phrase filters
  for (const phrase of mutePhrases) {
    whereConditions.push({
      field: "link.url",
      operator: "notIlike",
      value: `%${phrase.phrase}%`,
    });
    whereConditions.push({
      field: "link.title",
      operator: "notIlike",
      value: `%${phrase.phrase}%`,
    });
    whereConditions.push({
      field: "link.description",
      operator: "notIlike",
      value: `%${phrase.phrase}%`,
    });
  }

  // Build order by
  const orderByFields: OrderField[] = [];
  if (sort === "popularity") {
    orderByFields.push({ field: "uniqueActorsCount", direction: "desc" });
  } else {
    orderByFields.push({ field: "mostRecentPostDate", direction: "desc" });
  }
  orderByFields.push({ field: "mostRecentPostDate", direction: "desc" });

  // Create the federated query (snake_case tables, quoted camelCase columns)
  const builder = createQueryBuilder()
    .select({
      link: "link.*",
      uniqueActorsCount:
        'COUNT(DISTINCT COALESCE(link_post_denormalized."repostActorHandle", link_post_denormalized."actorHandle"))',
      mostRecentPostDate: 'MAX(link_post_denormalized."postDate")',
    })
    .from("link_post_denormalized")
    .join({
      type: "left",
      table: "link",
      on: 'link_post_denormalized."linkUrl" = link.url',
    })
    .where(whereConditions)
    .groupBy(['link_post_denormalized."linkUrl"', "link.id"])
    .having("COUNT(*) > 0")
    .orderBy(orderByFields)
    .limit(limit)
    .offset(offset);

  // Add min shares having condition if specified
  if (minShares) {
    builder.having(
      `COUNT(DISTINCT COALESCE(link_post_denormalized."repostActorHandle", link_post_denormalized."actorHandle")) >= ${minShares}`
    );
  }

  // Execute the federated query
  const engine = createQueryEngine();
  try {
    const result = await engine.executeQuery<FederatedQueryRow>(
      builder,
      queryContext
    );

    // Post-process to get individual posts for each link (matching original behavior)
    const resultsWithPosts = await Promise.all(
      result.rows.map(async (row) => {
        const posts = await db
          .select()
          .from(linkPostDenormalized)
          .where(
            and(
              eq(linkPostDenormalized.linkUrl, row.url || ""),
              eq(linkPostDenormalized.userId, userId),
              gte(linkPostDenormalized.postDate, start.toISOString()),
              listRecord
                ? eq(linkPostDenormalized.listId, listRecord.id)
                : undefined,
              service !== "all"
                ? eq(linkPostDenormalized.postType, service)
                : undefined,
              hideReposts
                ? isNull(linkPostDenormalized.repostActorHandle)
                : undefined
            )
          )
          .orderBy(desc(linkPostDenormalized.postDate));

        return {
          uniqueActorsCount: Number(row.uniqueactorscount) || 0,
          link: {
            id: row.id,
            url: row.url,
            title: row.title,
            description: row.description,
            imageUrl: row.imageUrl,
            giftUrl: row.giftUrl,
            metadata: row.metadata,
            scraped: row.scraped,
            publishedDate: row.publishedDate,
            authors: row.authors,
            siteName: row.siteName,
            topics: row.topics,
          },
          posts,
        };
      })
    );

    return resultsWithPosts;
  } finally {
    await engine.close();
  }
};

export const evaluateNotifications = async (
  userId: string,
  queries: NotificationQuery[],
  seenLinks: string[] = [],
  createdAt?: Date
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
          ])
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
          or(eq(link.title, query.value), eq(link.description, query.value))
        );
      }
      if (query.operator === "contains") {
        linkSQLQueries.push(
          or(
            ilike(link.title, `%${query.value}%`),
            ilike(link.description, `%${query.value}%`)
          )
        );
      }
      if (query.operator === "excludes") {
        linkSQLQueries.push(
          and(
            notIlike(link.title, `%${query.value}%`),
            notIlike(link.description, `%${query.value}%`)
          )
        );
      }
    }

    if (query.category.id === "post" && typeof query.value === "string") {
      if (query.operator === "equals") {
        postSQLQueries.push(eq(linkPostDenormalized.postText, query.value));
      }
      if (query.operator === "contains") {
        postSQLQueries.push(
          ilike(linkPostDenormalized.postText, `%${query.value}%`)
        );
      }
      if (query.operator === "excludes") {
        postSQLQueries.push(
          notIlike(linkPostDenormalized.postText, `%${query.value}%`)
        );
      }
    }

    if (query.category.id === "author" && typeof query.value === "string") {
      if (query.operator === "equals") {
        postSQLQueries.push(
          or(
            eq(linkPostDenormalized.actorName, query.value),
            eq(linkPostDenormalized.actorHandle, query.value)
          )
        );
      }
      if (query.operator === "contains") {
        postSQLQueries.push(
          or(
            ilike(linkPostDenormalized.actorName, `%${query.value}%`),
            ilike(linkPostDenormalized.actorHandle, `%${query.value}%`)
          )
        );
      }
      if (query.operator === "excludes") {
        postSQLQueries.push(
          or(
            notIlike(linkPostDenormalized.actorName, `%${query.value}%`),
            notIlike(linkPostDenormalized.actorHandle, `%${query.value}%`)
          )
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
            isNull(linkPostDenormalized.listId)
          )
        );
      }
    }
    if (query.category.id === "repost" && typeof query.value === "string") {
      if (query.operator === "equals") {
        postSQLQueries.push(
          or(
            eq(linkPostDenormalized.repostActorName, query.value),
            eq(linkPostDenormalized.repostActorHandle, query.value)
          )
        );
      }
      if (query.operator === "contains") {
        postSQLQueries.push(
          or(
            ilike(linkPostDenormalized.repostActorName, `%${query.value}%`),
            ilike(linkPostDenormalized.repostActorHandle, `%${query.value}%`)
          )
        );
      }
      if (query.operator === "excludes") {
        postSQLQueries.push(
          and(
            notIlike(linkPostDenormalized.repostActorName, `%${query.value}%`),
            notIlike(linkPostDenormalized.repostActorHandle, `%${query.value}%`)
          )
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
    (query) => query.category.id === "shares" && typeof query.value === "number"
  );

  return await db
    .select({
      link,
      uniqueActorsCount:
        getUniqueActorsCountSql(postMuteCondition).as("uniqueActorsCount"),
      mostRecentPostDate: sql<Date>`max(${linkPostDenormalized.postDate})`.as(
        "mostRecentPostDate"
      ),
    })
    .from(linkPostDenormalized)
    .leftJoin(link, eq(linkPostDenormalized.linkUrl, link.url))
    .where(
      and(
        eq(linkPostDenormalized.userId, userId),
        gte(linkPostDenormalized.postDate, start.toISOString()),
        notInArray(link.url, seenLinks),
        ...urlMuteClauses,
        ...linkSQLQueries,
        ...postSQLQueries
      )
    )
    .groupBy(linkPostDenormalized.linkUrl, link.id)
    .having(
      sharesQuery
        ? gte(getUniqueActorsCountSql(postMuteCondition), sharesQuery.value)
        : sql`count(*) > 0`
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
              gte(linkPostDenormalized.postDate, start.toISOString()),
              sql`${postMuteCondition} = 1`
            )
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
                "count"
              ),
          })
          .from(linkPostDenormalized)
          .where(
            and(
              eq(linkPostDenormalized.linkUrl, result.link?.url || ""),
              gte(linkPostDenormalized.postDate, start.toISOString())
            )
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

/**
 * Finds all link objects that have a URL matching the specified domain
 * @param domain Domain to match against (e.g., "example.com")
 * @param page Page number (1-based, defaults to 1)
 * @param pageSize Number of results per page (defaults to 10)
 * @returns Array of link objects with URLs from the specified domain, including linkPostDenormalized objects and total share count
 */
export const findLinksByDomain = async (
  domain: string,
  page = 1,
  pageSize = 10
) => {
  const offset = (page - 1) * pageSize;

  return await db
    .select({
      link,
      uniqueActorsCount: getUniqueActorsCountSql(sql`1`).as(
        "uniqueActorsCount"
      ),
      mostRecentPostDate: sql<Date>`max(${linkPostDenormalized.postDate})`.as(
        "mostRecentPostDate"
      ),
    })
    .from(linkPostDenormalized)
    .leftJoin(link, eq(linkPostDenormalized.linkUrl, link.url))
    .where(and(ilike(link.url, `%${domain}%`), isNotNull(link.publishedDate)))
    .groupBy(linkPostDenormalized.linkUrl, link.id)
    .having(sql`count(*) > 0`)
    .orderBy(desc(link.publishedDate), desc(sql`"uniqueActorsCount"`))
    .limit(pageSize)
    .offset(offset)
    .then(async (results) => {
      const postsPromise = results.map(async (result) => {
        const posts = await db
          .select()
          .from(linkPostDenormalized)
          .where(and(eq(linkPostDenormalized.linkUrl, result.link?.url || "")))
          .orderBy(desc(linkPostDenormalized.postDate));
        return {
          ...result,
          posts,
        };
      });
      return Promise.all(postsPromise);
    });
};

/**
 * Finds all link objects that have an author matching the specified name
 * @param author Author name to match against
 * @param page Page number (1-based, defaults to 1)
 * @param pageSize Number of results per page (defaults to 10)
 * @returns Array of link objects with the specified author, including linkPostDenormalized objects and total share count
 */
export const findLinksByAuthor = async (
  author: string,
  page = 1,
  pageSize = 10
) => {
  const offset = (page - 1) * pageSize;

  return await db
    .select({
      link,
      uniqueActorsCount: getUniqueActorsCountSql(sql`1`).as(
        "uniqueActorsCount"
      ),
      mostRecentPostDate: sql<Date>`max(${linkPostDenormalized.postDate})`.as(
        "mostRecentPostDate"
      ),
    })
    .from(linkPostDenormalized)
    .leftJoin(link, eq(linkPostDenormalized.linkUrl, link.url))
    .where(
      and(
        sql`${link.authors}::text ILIKE ${`%${author}%`}`,
        isNotNull(link.publishedDate)
      )
    )
    .groupBy(linkPostDenormalized.linkUrl, link.id)
    .having(sql`count(*) > 0`)
    .orderBy(desc(link.publishedDate), desc(sql`"uniqueActorsCount"`))
    .limit(pageSize)
    .offset(offset)
    .then(async (results) => {
      const postsPromise = results.map(async (result) => {
        const posts = await db
          .select()
          .from(linkPostDenormalized)
          .where(and(eq(linkPostDenormalized.linkUrl, result.link?.url || "")))
          .orderBy(desc(linkPostDenormalized.postDate));
        return {
          ...result,
          posts,
        };
      });
      return Promise.all(postsPromise);
    });
};

/**
 * Finds all link objects that have a topic matching the specified name
 * @param topic Topic name to match against
 * @param page Page number (1-based, defaults to 1)
 * @param pageSize Number of results per page (defaults to 10)
 * @returns Array of link objects with the specified topic, including linkPostDenormalized objects and total share count
 */
export const findLinksByTopic = async (
  topic: string,
  page = 1,
  pageSize = 10
) => {
  const offset = (page - 1) * pageSize;

  return await db
    .select({
      link,
      uniqueActorsCount: getUniqueActorsCountSql(sql`1`).as(
        "uniqueActorsCount"
      ),
      mostRecentPostDate: sql<Date>`max(${linkPostDenormalized.postDate})`.as(
        "mostRecentPostDate"
      ),
    })
    .from(linkPostDenormalized)
    .leftJoin(link, eq(linkPostDenormalized.linkUrl, link.url))
    .where(
      and(
        sql`${link.topics}::text ILIKE ${`%${topic}%`}`,
        isNotNull(link.publishedDate)
      )
    )
    .groupBy(linkPostDenormalized.linkUrl, link.id)
    .having(sql`count(*) > 0`)
    .orderBy(desc(link.publishedDate), desc(sql`"uniqueActorsCount"`))
    .limit(pageSize)
    .offset(offset)
    .then(async (results) => {
      const postsPromise = results.map(async (result) => {
        const posts = await db
          .select()
          .from(linkPostDenormalized)
          .where(and(eq(linkPostDenormalized.linkUrl, result.link?.url || "")))
          .orderBy(desc(linkPostDenormalized.postDate));
        return {
          ...result,
          posts,
        };
      });
      return Promise.all(postsPromise);
    });
};
