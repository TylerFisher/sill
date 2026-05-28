import {
  type SQL,
  and,
  desc,
  eq,
  getTableColumns,
  gte,
  ilike,
  inArray,
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
  blueskyAccount,
  mastodonAccount,
  mutePhrase,
  networkTopTenView,
  postType,
  type Link,
  type LinkPost,
  type MostRecentLinkPosts,
  type NotificationQuery,
} from "@sill/schema";
import {
  getLinksFromBluesky,
  getBlueskyList,
  processBlueskyLink,
  getOrCreateAgent,
} from "./bluesky.js";
import {
  getLinksFromMastodon,
  getMastodonList,
  processMastodonLink,
  isQuote,
} from "./mastodon.js";
import {
  appViewEnabled,
  distinctActorCount,
  fetchByAuthor,
  fetchByDomain,
  fetchHydration,
  fetchNetworkTrending,
  fetchUrlPage,
  resolveLeafletPublications,
  resolveRepostSubjects,
  type ShareRow,
  shareRowToLinkPost,
  type TimeWindow,
  toIso,
  type UrlItem,
  urlItemToLink,
} from "./appview.js";
import { getMergedOccurrences } from "./timeline.js";

const PAGE_SIZE = 10;
export interface ProcessedResult {
  link: typeof link.$inferInsert;
  denormalized: typeof linkPostDenormalized.$inferInsert;
}

/**
 * Fetches links from Mastodon and/or Bluesky
 * @param userId ID for logged in user
 * @param type Optional service type filter
 * @returns All fetched links from specified service(s)
 */
export const fetchLinks = async (
  userId: string,
  type?: "mastodon" | "bluesky",
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
 * Fetches links from a single list only
 * @param userId ID for logged in user
 * @param listId ID of the list to fetch
 * @returns Processed links from the specified list
 */
export const fetchSingleList = async (
  userId: string,
  listId: string,
): Promise<ProcessedResult[]> => {
  // Find the list and determine its type
  const dbList = await db.query.list.findFirst({
    where: eq(list.id, listId),
  });

  if (!dbList) {
    throw new Error(`List not found: ${listId}`);
  }

  // Determine if this is a Bluesky or Mastodon list
  if (dbList.blueskyAccountId) {
    // Fetch Bluesky list
    const account = await db.query.blueskyAccount.findFirst({
      where: eq(blueskyAccount.id, dbList.blueskyAccountId),
    });

    if (!account) {
      throw new Error(`Bluesky account not found for list: ${listId}`);
    }

    // Verify the account belongs to this user
    if (account.userId !== userId) {
      throw new Error("Unauthorized: list does not belong to this user");
    }

    const agent = await getOrCreateAgent(account);
    if (!agent) {
      throw new Error("Failed to authenticate with Bluesky");
    }
    const listPosts = await getBlueskyList(agent, dbList, account.handle);

    const processedResults = (
      await Promise.all(
        listPosts.map(async (post) =>
          processBlueskyLink(userId, post, dbList.id),
        ),
      )
    ).filter((p) => p !== null);

    return processedResults;
  }

  if (dbList.mastodonAccountId) {
    // Fetch Mastodon list
    const account = await db.query.mastodonAccount.findFirst({
      where: eq(mastodonAccount.id, dbList.mastodonAccountId),
      with: {
        mastodonInstance: true,
      },
    });

    if (!account) {
      throw new Error(`Mastodon account not found for list: ${listId}`);
    }

    // Verify the account belongs to this user
    if (account.userId !== userId) {
      throw new Error("Unauthorized: list does not belong to this user");
    }

    const listPosts = await getMastodonList(dbList.uri, account);

    // Filter for posts with cards (links)
    const linksOnly = listPosts.filter(
      (t) =>
        t.card ||
        t.reblog?.card ||
        (isQuote(t.quote) && t.quote.quotedStatus?.card),
    );

    const processedResults = (
      await Promise.all(
        linksOnly.map(async (post) =>
          processMastodonLink(userId, post, dbList.id),
        ),
      )
    ).filter((p) => p !== null);

    return processedResults;
  }

  throw new Error(`List ${listId} has no associated account`);
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
      chunk.reduce((acc, p) => {
        // Remove null bytes from URL and other string fields
        p.link.url = p.link.url.replace(/\0/g, "");
        if (p.link.title) p.link.title = p.link.title.replace(/\0/g, "");
        if (p.link.description)
          p.link.description = p.link.description.replace(/\0/g, "");
        if (p.link.imageUrl)
          p.link.imageUrl = p.link.imageUrl.replace(/\0/g, "");
        if (p.link.giftUrl) p.link.giftUrl = p.link.giftUrl.replace(/\0/g, "");

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
            title: p.link.title ?? existing?.title,
            description: p.link.description ?? existing?.description,
            imageUrl: p.link.imageUrl ?? existing?.imageUrl,
            giftUrl: existing?.giftUrl || p.link.giftUrl,
          };
        }
        return acc;
      }, {} as Record<string, (typeof processedResults)[0]["link"]>),
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
              scraped: sql`CASE
                WHEN ${link.scraped} = true THEN true
                ELSE COALESCE(excluded."scraped", false)
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
export interface FilterArgs {
  userId: string;
  time?: number;
  hideReposts?: "include" | "exclude" | "only";
  sort?: string;
  query?: string | undefined;
  service?: "mastodon" | "bluesky" | "all";
  page?: number;
  fetch?: boolean;
  selectedList?: string;
  limit?: number;
  url?: string;
  minShares?: number;
  /**
   * The DB sources to merge alongside the AppView's Bluesky timeline: Mastodon
   * (all) + Bluesky list posts, never the Bluesky following timeline (which the
   * AppView already serves). Overrides the `service` postType filter.
   */
  appViewMerge?: boolean;
  /**
   * Override the per-AppView-call page size (default 10, the feed value;
   * AppView caps at 100). Heavier sweeps (notifications) pass 100 to cover
   * their larger candidate set in fewer round trips.
   */
  appViewPageLimit?: number;
}

const DEFAULT_HIDE_REPOSTS = "include";
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
  minShares = undefined,
  appViewMerge = false,
}: FilterArgs) => {
  // DB sources that complement the AppView Bluesky timeline, never the Bluesky
  // following timeline (which the AppView serves). For service "bluesky" that's
  // just Bluesky list posts; otherwise Mastodon (all) + Bluesky lists.
  const blueskyListClause = and(
    eq(linkPostDenormalized.postType, "bluesky"),
    isNotNull(linkPostDenormalized.listId),
  );
  const serviceClause = appViewMerge
    ? service === "bluesky"
      ? blueskyListClause
      : or(eq(linkPostDenormalized.postType, "mastodon"), blueskyListClause)
    : service !== "all"
      ? eq(linkPostDenormalized.postType, service)
      : undefined;
  // Match a requested URL regardless of a trailing slash — the AppView's
  // canonical form and the DB's form can differ only by it.
  const urlBase = url?.replace(/\/+$/, "");
  const urlClause =
    urlBase !== undefined
      ? inArray(link.url, [urlBase, `${urlBase}/`])
      : undefined;
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
        gte(linkPostDenormalized.postDate, start.toISOString()),
        urlClause,
        listRecord ? eq(linkPostDenormalized.listId, listRecord.id) : undefined,
        ...urlMuteClauses,
        serviceClause,
        hideReposts === "exclude"
          ? isNull(linkPostDenormalized.repostActorHandle)
          : hideReposts === "only"
          ? isNotNull(linkPostDenormalized.repostActorHandle)
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
    .having(
      and(
        sql`count(*) > 0`,
        minShares
          ? sql`${getUniqueActorsCountSql(postMuteCondition)} >= ${minShares}`
          : undefined,
      ),
    )
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
              gte(linkPostDenormalized.postDate, start.toISOString()),
              sql`${postMuteCondition} = 1`,
              listRecord
                ? eq(linkPostDenormalized.listId, listRecord.id)
                : undefined,
              serviceClause,
              hideReposts === "exclude"
                ? isNull(linkPostDenormalized.repostActorHandle)
                : hideReposts === "only"
                ? isNotNull(linkPostDenormalized.repostActorHandle)
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

// --- Notification evaluation ---
//
// Source-aware: notifications query a mix of the AppView (Bluesky following)
// and the DB (Mastodon + Bluesky lists). The AppView already applies the
// viewer's combined mute lists via `/v1/preferences`; DB-side posts go through
// Sill's `mute_phrase` here in memory. The query DSL is parsed once into
// structured filters, then applied in two phases: source-routing (decides
// where to fetch from, and which conditions can be pushed server-side), and
// in-memory pruning (URL/post-level filters that the AppView can't express).
//
// Caps the candidate set per evaluation. `getMergedOccurrences` will walk
// AppView pages up to this many results; seenLinks dedupes across cycles, so
// even high-volume groups settle into a small steady-state per evaluation.
const NOTIFICATION_FETCH_LIMIT = 200;

interface ParsedNotificationFilters {
  serviceEquals?: "bluesky" | "mastodon";
  serviceExcludes: Set<"bluesky" | "mastodon" | "atbookmark">;
  listIdEquals?: string;
  listIdExcludes: Set<string>;
  minShares?: number;
  /** url/link/post/author/repost — applied in-memory below. */
  textQueries: NotificationQuery[];
}

const parseNotificationFilters = (
  queries: NotificationQuery[],
): ParsedNotificationFilters => {
  const filters: ParsedNotificationFilters = {
    serviceExcludes: new Set(),
    listIdExcludes: new Set(),
    textQueries: [],
  };
  for (const q of queries) {
    const id = q.category.id;
    if (id === "service" && typeof q.value === "string") {
      const v = postType.enumValues.find((pv) => pv === q.value);
      if (!v) continue;
      if (q.operator === "equals" && (v === "bluesky" || v === "mastodon")) {
        filters.serviceEquals = v;
      } else if (q.operator === "excludes") {
        filters.serviceExcludes.add(v);
      }
    } else if (id === "list" && typeof q.value === "string") {
      if (q.operator === "equals") filters.listIdEquals = q.value;
      else if (q.operator === "excludes") filters.listIdExcludes.add(q.value);
    } else if (id === "shares" && typeof q.value === "number") {
      // The original SQL applied every shares operator as a lower bound (`>=`),
      // so equals/>=/> all map to the same minShares — preserved here.
      filters.minShares = q.value;
    } else if (
      id === "url" ||
      id === "link" ||
      id === "post" ||
      id === "author" ||
      id === "repost"
    ) {
      filters.textQueries.push(q);
    }
  }
  return filters;
};

/**
 * Build a `/v1/search` query from the notification's text-contains filters
 * (url/link/post). Routes notifications with text terms to the AppView's
 * search endpoint instead of walking `/v1/latest` and filtering in memory.
 * Returns undefined when no contains-style text filter is present, in which
 * case the caller falls back to `/v1/latest`.
 *
 * NOTE on semantics: `/v1/search` matches **whole tokens** in post text /
 * title / description (URL substring still works as expected). Sill's
 * notification "contains" is substring, so a post containing "policlimate"
 * doesn't match a `"climate"` filter via `/v1/search`. The in-memory
 * `matchesTextQuery` runs after to apply Sill's substring semantics; the
 * residual gap is Bluesky-only posts that are substring-but-not-whole-token
 * matches (DB merge with ilike still catches Mastodon/list posts).
 */
const SEARCH_Q_MIN_LENGTH = 2;
const SEARCH_Q_MAX_LENGTH = 256;

const searchQueryFromFilters = (
  filters: ParsedNotificationFilters,
): string | undefined => {
  const terms = filters.textQueries
    .filter(
      (q) =>
        q.operator === "contains" &&
        (q.category.id === "url" ||
          q.category.id === "link" ||
          q.category.id === "post") &&
        typeof q.value === "string" &&
        q.value.trim().length > 0,
    )
    .map((q) => String(q.value).trim());
  if (terms.length === 0) return undefined;
  // `/v1/search` already AND-combines tokens across post text / title /
  // description, so multiple contains-terms join naturally.
  const joined = terms.join(" ").slice(0, SEARCH_Q_MAX_LENGTH);
  return joined.length >= SEARCH_Q_MIN_LENGTH ? joined : undefined;
};

const includesCi = (h: string | null | undefined, n: string): boolean =>
  !!h && h.toLowerCase().includes(n.toLowerCase());

const distinctActorsInPosts = (posts: LinkPost[]): number => {
  const ids = new Set<string>();
  for (const p of posts) {
    const id = p.repostActorHandle ?? p.actorHandle;
    if (id) ids.add(id);
  }
  return ids.size;
};

/**
 * Rebuild a result after its `posts` array has been pruned so the share count
 * and most-recent date track the post set that's actually being delivered.
 * Without this, the minShares safety net below would compare against stale
 * pre-prune counts.
 */
const rebuildItem = <T extends { posts?: LinkPost[]; uniqueActorsCount: number; mostRecentPostDate?: Date }>(
  item: T,
  posts: LinkPost[],
): T => {
  const sorted = [...posts].sort(
    (a, b) => new Date(b.postDate).getTime() - new Date(a.postDate).getTime(),
  );
  const mostRecent = sorted[0]
    ? new Date(`${sorted[0].postDate}Z`)
    : item.mostRecentPostDate;
  return {
    ...item,
    posts: sorted,
    uniqueActorsCount: distinctActorsInPosts(sorted),
    mostRecentPostDate: mostRecent,
  };
};

const applySillMutePhrases = <T extends { link: Link | null; posts?: LinkPost[]; uniqueActorsCount: number; mostRecentPostDate?: Date }>(
  items: T[],
  phrases: string[],
): T[] => {
  if (phrases.length === 0) return items;
  const out: T[] = [];
  for (const item of items) {
    const urlMuted = phrases.some(
      (p) =>
        includesCi(item.link?.url, p) ||
        includesCi(item.link?.title, p) ||
        includesCi(item.link?.description, p),
    );
    if (urlMuted) continue;
    const posts = (item.posts ?? []).filter(
      (post) =>
        !phrases.some(
          (p) =>
            includesCi(post.postText, p) ||
            includesCi(post.postUrl, p) ||
            includesCi(post.actorName, p) ||
            includesCi(post.actorHandle, p) ||
            includesCi(post.quotedPostText, p) ||
            includesCi(post.quotedActorName, p) ||
            includesCi(post.quotedActorHandle, p) ||
            includesCi(post.repostActorName, p) ||
            includesCi(post.repostActorHandle, p),
        ),
    );
    if (posts.length === 0) continue;
    out.push(rebuildItem(item, posts));
  }
  return out;
};

const applyServiceListFilters = <T extends { posts?: LinkPost[]; uniqueActorsCount: number; mostRecentPostDate?: Date }>(
  items: T[],
  filters: ParsedNotificationFilters,
): T[] => {
  const { serviceEquals, serviceExcludes, listIdEquals, listIdExcludes } =
    filters;
  const noPostLevel =
    !serviceEquals &&
    serviceExcludes.size === 0 &&
    !listIdEquals &&
    listIdExcludes.size === 0;
  if (noPostLevel) return items;
  const out: T[] = [];
  for (const item of items) {
    const posts = (item.posts ?? []).filter((p) => {
      if (serviceEquals && p.postType !== serviceEquals) return false;
      if (serviceExcludes.has(p.postType)) return false;
      if (listIdEquals && p.listId !== listIdEquals) return false;
      if (p.listId && listIdExcludes.has(p.listId)) return false;
      return true;
    });
    if (posts.length === 0) continue;
    out.push(rebuildItem(item, posts));
  }
  return out;
};

const matchesTextQuery = (
  item: { link: Link | null; posts?: LinkPost[] },
  q: NotificationQuery,
): boolean => {
  if (typeof q.value !== "string") return true;
  const op = q.operator;
  const needle = q.value;
  let haystacks: (string | null | undefined)[];
  switch (q.category.id) {
    case "url":
      haystacks = [item.link?.url];
      break;
    case "link":
      haystacks = [item.link?.title, item.link?.description];
      break;
    case "post":
      haystacks = (item.posts ?? []).map((p) => p.postText);
      break;
    case "author":
      haystacks = (item.posts ?? []).flatMap((p) => [
        p.actorName,
        p.actorHandle,
      ]);
      break;
    case "repost":
      haystacks = (item.posts ?? []).flatMap((p) => [
        p.repostActorName,
        p.repostActorHandle,
      ]);
      break;
    default:
      return true;
  }
  if (op === "equals") return haystacks.some((h) => !!h && h === needle);
  if (op === "contains") return haystacks.some((h) => includesCi(h, needle));
  // `excludes`: NONE of the haystacks contain the needle (matches SQL "link"
  // semantics; tightens the buggier "any-doesn't-contain" SQL for author/repost).
  if (op === "excludes") return haystacks.every((h) => !includesCi(h, needle));
  return true;
};

export const evaluateNotifications = async (
  userId: string,
  queries: NotificationQuery[],
  seenLinks: string[] = [],
  createdAt?: Date,
  /**
   * Cap the candidate set this evaluation pulls. Defaults to the full sweep
   * for production notifications; the test/preview endpoint passes a smaller
   * value so an interactive UI ping is a single small fetch + hydration
   * instead of the full two-page walk.
   */
  candidateLimit: number = NOTIFICATION_FETCH_LIMIT,
) => {
  const start = createdAt
    ? new Date(Math.max(createdAt.getTime(), Date.now() - ONE_DAY_MS))
    : new Date(Date.now() - ONE_DAY_MS);
  const timeMs = Date.now() - start.getTime();
  const filters = parseNotificationFilters(queries);
  const seen = new Set(seenLinks);

  // Pick the source. A list filter or `service=mastodon` restricts to data the
  // AppView doesn't have (lists are DB-stored; Mastodon never reached the
  // AppView), so those go straight to the DB. Everything else routes through
  // the merged AppView + DB path. `minShares` is applied to the combined count
  // (post-merge) — never pushed to the AppView, since pre-filtering by
  // Bluesky-only share count would drop URLs whose combined count crosses the
  // threshold via Mastodon or Bluesky-list contributions.
  const useDbOnly =
    filters.listIdEquals !== undefined ||
    filters.serviceEquals === "mastodon";

  // Match the AppView per-page size to the candidate cap (clamped to the
  // AppView's 1–100 range). Small caps (test/preview) avoid over-fetching;
  // the full sweep uses 100/page so the 200-URL slice fits in 2 round trips.
  const appViewPageLimit = Math.min(100, Math.max(10, candidateLimit));

  let candidates;
  if (useDbOnly) {
    candidates = await filterLinkOccurrences({
      userId,
      service: filters.serviceEquals ?? "all",
      selectedList: filters.listIdEquals ?? "all",
      time: timeMs,
      hideReposts: "include",
      page: 1,
      fetch: false,
      limit: candidateLimit,
      minShares: filters.minShares,
    });
  } else {
    // Route text-search notifications to `/v1/search` (set via args.query —
    // `fetchUrlPage` already maps that to the search endpoint). The DB side
    // of the merge uses the same query for its substring ilike, which catches
    // substring-but-not-whole-token matches the AppView's tokenizer skips.
    const searchQuery = searchQueryFromFilters(filters);
    candidates = await getMergedOccurrences({
      userId,
      service: filters.serviceEquals ?? "all",
      selectedList: "all",
      time: timeMs,
      hideReposts: "include",
      // Recency-sort so the AppView page walk samples the freshest URLs first.
      // The polling loop + seenLinks naturally process new activity each cycle;
      // a popularity sort would bias the candidate set toward already-popular
      // URLs and miss long-tail matches for text-only queries. (Ignored when
      // `query` is set — `/v1/search` returns by share count desc.)
      sort: "newest",
      query: searchQuery,
      page: 1,
      fetch: false,
      limit: candidateLimit,
      minShares: filters.minShares,
      appViewPageLimit,
    });
  }

  // Drop links already delivered for this group.
  let items = candidates.filter(
    (c) => !!c.link?.url && !seen.has(c.link.url),
  );

  // Sill mutePhrase in-memory. AppView URLs are already pre-filtered for the
  // viewer's combined mutes via `/v1/preferences`, but DB-side posts (Mastodon,
  // Bluesky lists) need them applied here.
  const mutePhrases = (await getMutePhrases(userId)).map((p) => p.phrase);
  items = applySillMutePhrases(items, mutePhrases);

  // Post-level service/list filters (shrinks the post set, recomputes counts).
  items = applyServiceListFilters(items, filters);

  // Text/operator filters (url/link/post/author/repost).
  for (const q of filters.textQueries) {
    items = items.filter((c) => matchesTextQuery(c, q));
  }

  // Re-apply the minShares threshold against the possibly-reduced combined
  // count — post-level filters can drop posts and lower the count.
  if (filters.minShares !== undefined && filters.minShares > 0) {
    const threshold = filters.minShares;
    items = items.filter((c) => c.uniqueActorsCount >= threshold);
  }

  // Match the previous SQL ordering: popularity desc, then recency.
  items.sort((a, b) => {
    if (b.uniqueActorsCount !== a.uniqueActorsCount) {
      return b.uniqueActorsCount - a.uniqueActorsCount;
    }
    const ad = a.mostRecentPostDate
      ? new Date(a.mostRecentPostDate).getTime()
      : 0;
    const bd = b.mostRecentPostDate
      ? new Date(b.mostRecentPostDate).getTime()
      : 0;
    return bd - ad;
  });

  return items;
};

/**
 * Approximate match count for the `/api/notifications/test` endpoint — same
 * source routing as `evaluateNotifications` but **without hydration**, since
 * the caller (the notification-builder UI) just needs an interactive preview
 * the user explicitly asks for. The preview walks the full 24h window so
 * matches anywhere in the period are reflected, paginating `/v1/latest` to
 * exhaustion (or `PREVIEW_MAX_PAGES`). Post-level filters (post/author/repost
 * text, post-level service/list, mute phrases against post fields) are
 * skipped — the URL items from `/v1/latest` carry no post data, so post-level
 * filters would be a no-op anyway. The real notification firing later runs
 * `evaluateNotifications` (full sweep with hydration), which is the source of
 * truth.
 */
// 100 pages × 100 URLs = up to 10k URLs over 24h. Covers all but the heaviest
// networks; anything above counts as "many" for UI purposes.
const PREVIEW_MAX_PAGES = 100;
// `/v1/search` returns a much narrower set, so we cap the page walk lower —
// 5 × 100 = 500 search hits is more than enough for a count preview.
const PREVIEW_SEARCH_MAX_PAGES = 5;
const PREVIEW_DB_LIMIT = 10_000;

export const previewNotificationCount = async (
  userId: string,
  queries: NotificationQuery[],
): Promise<number> => {
  const filters = parseNotificationFilters(queries);

  const useDbOnly =
    filters.listIdEquals !== undefined ||
    filters.serviceEquals === "mastodon";

  // We only need each candidate's `link` and `uniqueActorsCount` — no posts.
  let items: { link: Link | null; uniqueActorsCount: number }[];

  if (useDbOnly) {
    items = await filterLinkOccurrences({
      userId,
      service: filters.serviceEquals ?? "all",
      selectedList: filters.listIdEquals ?? "all",
      time: ONE_DAY_MS,
      hideReposts: "include",
      page: 1,
      fetch: false,
      limit: PREVIEW_DB_LIMIT,
      minShares: filters.minShares,
    });
  } else {
    const bsky = await db.query.blueskyAccount.findFirst({
      where: eq(blueskyAccount.userId, userId),
    });
    if (!bsky || !appViewEnabled()) {
      // No AppView available — degrade to the DB. Bluesky-following posts
      // won't be reflected (worker no longer ingests them), but the preview
      // is best-effort and the user can save and verify against a real fire.
      items = await filterLinkOccurrences({
        userId,
        service: filters.serviceEquals ?? "all",
        selectedList: "all",
        time: ONE_DAY_MS,
        hideReposts: "include",
        page: 1,
        fetch: false,
        limit: PREVIEW_DB_LIMIT,
        minShares: filters.minShares,
      });
    } else {
      // AppView only — no `/v1/hydration`, no Slingshot. Router:
      //   - text-contains on url/link/post → `/v1/search` (smaller candidate
      //     set from server-side matching; minShares applied in-memory below
      //     since `/v1/search` doesn't accept it).
      //   - otherwise → `/v1/latest` paginated to exhaustion (or safety cap),
      //     with `minShares` pushed server-side as a pre-filter.
      const searchQuery = searchQueryFromFilters(filters);
      const allItems: Awaited<ReturnType<typeof fetchUrlPage>>["items"] = [];
      let cursor: string | undefined;
      const maxPages = searchQuery ? PREVIEW_SEARCH_MAX_PAGES : PREVIEW_MAX_PAGES;
      for (let page = 0; page < maxPages; page++) {
        const res = await fetchUrlPage({
          viewer: bsky.did,
          window: { days: 1 },
          limit: 100,
          cursor,
          sort: "recency",
          hideReposts: "include",
          query: searchQuery,
          minShares: searchQuery ? undefined : filters.minShares,
        });
        allItems.push(...res.items);
        cursor = res.cursor;
        if (!cursor || res.items.length === 0) break;
      }
      items = allItems.map((item) => ({
        link: urlItemToLink(item, null),
        uniqueActorsCount: item.shares ?? 0,
      }));
    }
  }

  // URL-level mute phrases (post-level mutes skipped — no post data).
  const mutePhrases = (await getMutePhrases(userId)).map((p) => p.phrase);
  if (mutePhrases.length > 0) {
    items = items.filter(
      (item) =>
        !mutePhrases.some(
          (p) =>
            includesCi(item.link?.url, p) ||
            includesCi(item.link?.title, p) ||
            includesCi(item.link?.description, p),
        ),
    );
  }

  // URL-level text filters only (`url`, `link`). post/author/repost skipped.
  for (const q of filters.textQueries) {
    if (q.category.id !== "url" && q.category.id !== "link") continue;
    items = items.filter((item) =>
      matchesTextQuery({ link: item.link, posts: [] }, q),
    );
  }

  if (filters.minShares !== undefined && filters.minShares > 0) {
    const threshold = filters.minShares;
    items = items.filter((c) => c.uniqueActorsCount >= threshold);
  }

  return items.length;
};

export interface TopTenResults {
  uniqueActorsCount: number;
  link: typeof link.$inferSelect | null;
  posts?: (typeof linkPostDenormalized.$inferSelect & { count: number })[];
  mostRecentPostDate: Date;
}

/**
 * The "Most popular post" for a URL: the single most-shared post across all of
 * Sill's indexed posts (not viewer-scoped) within the window. May be undefined
 * for URLs Sill hasn't ingested a post for.
 */
const topPostForUrl = async (url: string, start: Date) =>
  db
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
        eq(linkPostDenormalized.linkUrl, url),
        gte(linkPostDenormalized.postDate, start.toISOString()),
      ),
    )
    .orderBy(desc(sql`count`))
    .limit(1)
    .then((posts) => posts[0]);

/**
 * Global trending for the discovery page. Ranking comes from the AppView's
 * `/v1/network-trending` (whole-index, fresh) when configured, falling back to
 * the DB materialized view. Link metadata and the representative "most popular
 * post" are enriched from Sill's DB in both cases.
 */
export const networkTopTen = async (): Promise<TopTenResults[]> => {
  if (appViewEnabled()) {
    try {
      return await networkTopTenFromAppView();
    } catch (e) {
      console.error("AppView network-trending failed, falling back to DB:", e);
    }
  }
  return networkTopTenFromDb();
};

const networkTopTenFromAppView = async (): Promise<TopTenResults[]> => {
  const items = await fetchNetworkTrending({ limit: 10 });
  if (items.length === 0) return [];

  // The AppView carries URL metadata; only fall back to the DB for URLs it
  // hasn't scraped (no title).
  const fallbackUrls = items.filter((i) => !i.title).map((i) => i.url);
  const dbLinks = fallbackUrls.length
    ? await db.select().from(link).where(inArray(link.url, fallbackUrls))
    : [];
  const dbLinkByUrl = new Map(dbLinks.map((l) => [l.url, l]));

  return items.map((item) => {
    // The AppView supplies the most-shared post for the URL (topPost); map it
    // to Sill's post shape. `count` is that post's reposts + quotes.
    const posts = item.topPost
      ? [{ ...shareRowToLinkPost(item.topPost, ""), count: item.topPost.shares }]
      : undefined;
    return {
      uniqueActorsCount: item.shares ?? 0,
      link: urlItemToLink(item, dbLinkByUrl.get(item.url) ?? null),
      mostRecentPostDate: new Date(toIso(item.mostRecent) ?? Date.now()),
      posts,
    };
  });
};

const networkTopTenFromDb = async (): Promise<TopTenResults[]> => {
  const start = new Date(Date.now() - 10800000);

  return db
    .select()
    .from(networkTopTenView)
    .then(async (results) => {
      const postsPromise = results.map(async (result) => {
        const post = await topPostForUrl(result.link?.url || "", start);
        return {
          ...result,
          posts: post ? [post] : undefined,
        };
      });
      return Promise.all(postsPromise);
    });
};

// Broad window for the by-domain / by-author discovery pages.
const DISCOVERY_WINDOW: TimeWindow = { days: 90 };

/** A viewer's Bluesky DID, or null if they have no Bluesky account. */
const viewerDidForUser = async (userId: string): Promise<string | null> => {
  const account = await db.query.blueskyAccount.findFirst({
    where: eq(blueskyAccount.userId, userId),
  });
  return account?.did ?? null;
};

/**
 * Hydrate AppView UrlItems (from by-domain/by-author) into the renderable shape,
 * eagerly loading each URL's posts for the viewer's network.
 */
const linksFromAppViewItems = async (
  items: UrlItem[],
  viewerDid: string,
  userId: string,
): Promise<MostRecentLinkPosts[]> => {
  if (items.length === 0) return [];

  let shares = await fetchHydration({
    viewer: viewerDid,
    window: DISCOVERY_WINDOW,
    urls: items.map((i) => i.url),
    hideReposts: "include",
  });
  shares = await resolveRepostSubjects(shares);

  const sharesByUrl = new Map<string, ShareRow[]>();
  for (const s of shares) {
    const list = sharesByUrl.get(s.url);
    if (list) list.push(s);
    else sharesByUrl.set(s.url, [s]);
  }

  // DB only as a metadata fallback for URLs the AppView hasn't titled.
  const fallbackUrls = items.filter((i) => !i.title).map((i) => i.url);
  const dbLinks = fallbackUrls.length
    ? await db.select().from(link).where(inArray(link.url, fallbackUrls))
    : [];
  const dbLinkByUrl = new Map(dbLinks.map((l) => [l.url, l]));

  return items.map((item) => {
    const urlShares = sharesByUrl.get(item.url) ?? [];
    const posts = urlShares
      .map((s) => shareRowToLinkPost(s, userId))
      .sort(
        (a, b) =>
          new Date(b.postDate).getTime() - new Date(a.postDate).getTime(),
      );
    return {
      uniqueActorsCount: item.shares ?? distinctActorCount(urlShares),
      link: urlItemToLink(item, dbLinkByUrl.get(item.url) ?? null),
      posts,
    };
  });
};

/**
 * Finds links from a hostname. When the AppView is configured and the viewer
 * has a Bluesky account, this comes from `/v1/by-domain` (scoped to the
 * viewer's network); otherwise it falls back to the DB.
 * @param domain Domain to match against (e.g., "example.com")
 * @param page Page number (1-based, defaults to 1)
 * @param pageSize Number of results per page (defaults to 10)
 * @param userId Viewer whose network scopes the AppView lookup
 */
export const findLinksByDomain = async (
  domain: string,
  page = 1,
  pageSize = 10,
  userId?: string,
): Promise<MostRecentLinkPosts[]> => {
  if (userId && appViewEnabled()) {
    const viewerDid = await viewerDidForUser(userId);
    if (viewerDid) {
      try {
        const items = await fetchByDomain({
          domain,
          viewer: viewerDid,
          window: DISCOVERY_WINDOW,
          limit: pageSize,
        });
        return await linksFromAppViewItems(items, viewerDid, userId);
      } catch (e) {
        console.error("AppView by-domain failed, falling back to DB:", e);
      }
    }
  }
  return findLinksByDomainFromDb(domain, page, pageSize);
};

const findLinksByDomainFromDb = async (
  domain: string,
  page = 1,
  pageSize = 10,
) => {
  const offset = (page - 1) * pageSize;

  return await db
    .select({
      link,
      uniqueActorsCount: getUniqueActorsCountSql(sql`1`).as(
        "uniqueActorsCount",
      ),
      mostRecentPostDate: sql<Date>`max(${linkPostDenormalized.postDate})`.as(
        "mostRecentPostDate",
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
/**
 * Finds links whose article byline matches `author`. AppView `/v1/by-author`
 * (viewer-scoped) when configured, else the DB.
 * @param author Author name to match against
 * @param page Page number (1-based, defaults to 1)
 * @param pageSize Number of results per page (defaults to 10)
 * @param userId Viewer whose network scopes the AppView lookup
 */
export const findLinksByAuthor = async (
  author: string,
  page = 1,
  pageSize = 10,
  userId?: string,
): Promise<MostRecentLinkPosts[]> => {
  if (userId && appViewEnabled()) {
    const viewerDid = await viewerDidForUser(userId);
    if (viewerDid) {
      try {
        const items = await fetchByAuthor({
          author,
          viewer: viewerDid,
          window: DISCOVERY_WINDOW,
          limit: pageSize,
        });
        return await linksFromAppViewItems(items, viewerDid, userId);
      } catch (e) {
        console.error("AppView by-author failed, falling back to DB:", e);
      }
    }
  }
  return findLinksByAuthorFromDb(author, page, pageSize);
};

const findLinksByAuthorFromDb = async (
  author: string,
  page = 1,
  pageSize = 10,
) => {
  const offset = (page - 1) * pageSize;

  return await db
    .select({
      link,
      uniqueActorsCount: getUniqueActorsCountSql(sql`1`).as(
        "uniqueActorsCount",
      ),
      mostRecentPostDate: sql<Date>`max(${linkPostDenormalized.postDate})`.as(
        "mostRecentPostDate",
      ),
    })
    .from(linkPostDenormalized)
    .leftJoin(link, eq(linkPostDenormalized.linkUrl, link.url))
    .where(
      and(
        sql`${link.authors}::text ILIKE ${`%${author}%`}`,
        isNotNull(link.publishedDate),
      ),
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
  pageSize = 10,
) => {
  const offset = (page - 1) * pageSize;

  return await db
    .select({
      link,
      uniqueActorsCount: getUniqueActorsCountSql(sql`1`).as(
        "uniqueActorsCount",
      ),
      mostRecentPostDate: sql<Date>`max(${linkPostDenormalized.postDate})`.as(
        "mostRecentPostDate",
      ),
    })
    .from(linkPostDenormalized)
    .leftJoin(link, eq(linkPostDenormalized.linkUrl, link.url))
    .where(
      and(
        sql`${link.topics}::text ILIKE ${`%${topic}%`}`,
        isNotNull(link.publishedDate),
      ),
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
