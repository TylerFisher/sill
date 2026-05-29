import { type SQL, and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  list,
  blueskyAccount,
  mastodonAccount,
  mutePhrase,
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
  type PushShare,
  type PushShareBatch,
  type PushShareSource,
  pushShareBatches,
  resolveLeafletPublications,
  resolveRepostSubjects,
  type ShareRow,
  shareRowToLinkPost,
  type TimeWindow,
  toIso,
  type UrlItem,
  urlItemToLink,
} from "./appview.js";
import { getMergedOccurrences, sourceIdForList } from "./timeline.js";

const PAGE_SIZE = 10;

/**
 * Collect a user's observed Mastodon and/or Bluesky-list/feed shares for the
 * AppView's `POST /v1/shares`. Returns a single `{viewer, shares}` batch with
 * both networks merged (they always have the same viewer DID), or null when
 * nothing was observed. Callers push to the AppView — workers should
 * accumulate across users and flush once via `pushShareBatches`; one-off
 * callers can pass the result as `[batch]` directly.
 */
export const fetchLinks = async (
  userId: string,
  type?: "mastodon" | "bluesky",
): Promise<PushShareBatch | null> => {
  let masto: PushShareBatch | null = null;
  let bsky: PushShareBatch | null = null;

  if (type === "mastodon") {
    masto = await getLinksFromMastodon(userId);
  } else if (type === "bluesky") {
    bsky = await getLinksFromBluesky(userId);
  } else {
    [masto, bsky] = await Promise.all([
      getLinksFromMastodon(userId),
      getLinksFromBluesky(userId),
    ]);
  }

  const viewer = masto?.viewer ?? bsky?.viewer;
  if (!viewer) return null;
  const shares = [...(masto?.shares ?? []), ...(bsky?.shares ?? [])];
  return shares.length > 0 ? { viewer, shares } : null;
};

/**
 * Collect shares from a single Bluesky/Mastodon list for the AppView. Returns
 * a `{viewer, shares}` batch (or null when nothing's there). Caller pushes —
 * one-off API routes typically just wrap the result as `[batch]`.
 */
export const fetchSingleList = async (
  userId: string,
  listId: string,
): Promise<PushShareBatch | null> => {
  const dbList = await db.query.list.findFirst({
    where: eq(list.id, listId),
  });
  if (!dbList) {
    throw new Error(`List not found: ${listId}`);
  }

  if (dbList.blueskyAccountId) {
    const account = await db.query.blueskyAccount.findFirst({
      where: eq(blueskyAccount.id, dbList.blueskyAccountId),
    });
    if (!account) {
      throw new Error(`Bluesky account not found for list: ${listId}`);
    }
    if (account.userId !== userId) {
      throw new Error("Unauthorized: list does not belong to this user");
    }
    const agent = await getOrCreateAgent(account);
    if (!agent) {
      throw new Error("Failed to authenticate with Bluesky");
    }
    // Bluesky list/feed at-URI is passed verbatim under the `at-uri` kind.
    const source: PushShareSource = { kind: "at-uri", uri: dbList.uri };
    const listPosts = await getBlueskyList(agent, dbList, account.handle);
    const shares: PushShare[] = [];
    for (const post of listPosts) {
      const share = await processBlueskyLink(post, source);
      if (share) shares.push(share);
    }
    return shares.length > 0 ? { viewer: account.did, shares } : null;
  }

  if (dbList.mastodonAccountId) {
    const account = await db.query.mastodonAccount.findFirst({
      where: eq(mastodonAccount.id, dbList.mastodonAccountId),
      with: { mastodonInstance: true },
    });
    if (!account) {
      throw new Error(`Mastodon account not found for list: ${listId}`);
    }
    if (account.userId !== userId) {
      throw new Error("Unauthorized: list does not belong to this user");
    }
    const viewerAccount = await db.query.blueskyAccount.findFirst({
      where: eq(blueskyAccount.userId, userId),
    });
    if (!viewerAccount) return null; // see getLinksFromMastodon

    const listPosts = await getMastodonList(dbList.uri, account);
    // Mastodon list source carries (instance, id) — canonicalised AppView-side
    // to `mastodon-list://<instance>/<id>` for the `?sourceId=` filter.
    const source: PushShareSource = {
      kind: "mastodon-list",
      instance: account.mastodonInstance.instance,
      id: dbList.uri,
    };
    const shares: PushShare[] = [];
    for (const post of listPosts) {
      if (
        !(
          post.card ||
          post.reblog?.card ||
          (isQuote(post.quote) && post.quote.quotedStatus?.card)
        )
      ) {
        continue;
      }
      const share = await processMastodonLink(post, source);
      if (share) shares.push(share);
    }
    return shares.length > 0 ? { viewer: viewerAccount.did, shares } : null;
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

  const appViewPageLimit = Math.min(100, Math.max(10, candidateLimit));
  // Route text-search notifications to `/v1/search` via `args.query`.
  const searchQuery = searchQueryFromFilters(filters);

  // Everything routes through the AppView. The list filter becomes
  // `?sourceId=` inside `getMergedOccurrences` (via `selectedList`), and the
  // service filter is applied in-memory below on the hydrated posts.
  const candidates = await getMergedOccurrences({
    userId,
    service: filters.serviceEquals ?? "all",
    selectedList: filters.listIdEquals ?? "all",
    time: timeMs,
    hideReposts: "include",
    sort: "newest",
    query: searchQuery,
    page: 1,
    fetch: false,
    limit: candidateLimit,
    minShares: filters.minShares,
    appViewPageLimit,
  });

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

export const previewNotificationCount = async (
  userId: string,
  queries: NotificationQuery[],
): Promise<number> => {
  const filters = parseNotificationFilters(queries);

  if (!appViewEnabled()) return 0;
  const bsky = await db.query.blueskyAccount.findFirst({
    where: eq(blueskyAccount.userId, userId),
  });
  if (!bsky) return 0;

  const sourceId = filters.listIdEquals
    ? await sourceIdForList(filters.listIdEquals)
    : undefined;
  const searchQuery = searchQueryFromFilters(filters);

  // AppView only — no hydration, no Slingshot. Walk `/v1/search` for
  // text-contains notifications, `/v1/latest` otherwise.
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
      sourceId,
    });
    allItems.push(...res.items);
    cursor = res.cursor;
    if (!cursor || res.items.length === 0) break;
  }
  let items: { link: Link | null; uniqueActorsCount: number }[] = allItems.map(
    (item) => ({
      link: urlItemToLink(item, null),
      uniqueActorsCount: item.shares ?? 0,
    }),
  );

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
  link: Link | null;
  posts?: (LinkPost & { count: number })[];
  mostRecentPostDate: Date;
}

/**
 * Global trending for the discovery page. Comes from the AppView's
 * `/v1/network-trending` (whole-index, fresh); empty when the AppView is
 * unreachable.
 */
export const networkTopTen = async (): Promise<TopTenResults[]> => {
  if (!appViewEnabled()) return [];
  const items = await fetchNetworkTrending({ limit: 10 });
  return items.map((item) => {
    // The AppView supplies the most-shared post for the URL (topPost); map it
    // to Sill's post shape. `count` is that post's reposts + quotes.
    const posts = item.topPost
      ? [{ ...shareRowToLinkPost(item.topPost, ""), count: item.topPost.shares }]
      : undefined;
    return {
      uniqueActorsCount: item.shares ?? 0,
      link: urlItemToLink(item, null),
      mostRecentPostDate: new Date(toIso(item.mostRecent) ?? Date.now()),
      posts,
    };
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
      link: urlItemToLink(item, null),
      posts,
    };
  });
};

/**
 * Finds links from a hostname (viewer-scoped) via the AppView's `/v1/by-domain`.
 * Returns an empty list if the AppView is unavailable or the viewer has no
 * Bluesky account.
 * @param domain Domain to match against (e.g., "example.com")
 * @param pageSize Number of results per page (defaults to 10)
 * @param userId Viewer whose network scopes the lookup
 */
export const findLinksByDomain = async (
  domain: string,
  pageSize = 10,
  userId?: string,
): Promise<MostRecentLinkPosts[]> => {
  if (!userId || !appViewEnabled()) return [];
  const viewerDid = await viewerDidForUser(userId);
  if (!viewerDid) return [];
  const items = await fetchByDomain({
    domain,
    viewer: viewerDid,
    window: DISCOVERY_WINDOW,
    limit: pageSize,
  });
  return linksFromAppViewItems(items, viewerDid, userId);
};

/**
 * Finds links whose article byline matches `author` (viewer-scoped) via the
 * AppView's `/v1/by-author`. Returns an empty list if the AppView is
 * unavailable or the viewer has no Bluesky account.
 * @param author Author name to match against
 * @param pageSize Number of results per page (defaults to 10)
 * @param userId Viewer whose network scopes the lookup
 */
export const findLinksByAuthor = async (
  author: string,
  pageSize = 10,
  userId?: string,
): Promise<MostRecentLinkPosts[]> => {
  if (!userId || !appViewEnabled()) return [];
  const viewerDid = await viewerDidForUser(userId);
  if (!viewerDid) return [];
  const items = await fetchByAuthor({
    author,
    viewer: viewerDid,
    window: DISCOVERY_WINDOW,
    limit: pageSize,
  });
  return linksFromAppViewItems(items, viewerDid, userId);
};
