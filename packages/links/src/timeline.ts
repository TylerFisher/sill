import { eq, inArray } from "drizzle-orm";
import { blueskyAccount, db, link, type Link, type LinkPost } from "@sill/schema";
import {
  appViewEnabled,
  distinctActorCount,
  fetchHydration,
  fetchUrlPage,
  type ShareRow,
  shareRowToLinkPost,
  toIso,
  type UrlItem,
  urlItemToLink,
} from "./appview.js";
import { type FilterArgs, filterLinkOccurrences } from "./links.js";

/**
 * The default Bluesky timeline, backed by the Sill AppView API.
 *
 * `filterLinkOccurrences` (the DB aggregation) is left untouched and still
 * powers bookmarks, digests, notifications, and the initial sync. `getTimeline`
 * is the read path for the `/links` view: for the basic timeline it pulls
 * Bluesky shares from the AppView and merges them with Mastodon shares from the
 * DB, re-ranking by combined distinct-sharer count. Custom feeds (lists),
 * Mastodon-only views, specific-link lookups, the sync (`fetch=true`) path, and
 * any environment without the AppView configured all fall back to the DB.
 */

const DEFAULT_LIMIT = 10;
const ONE_DAY_MS = 86400000;

/** Max URLs pulled from the AppView for ranking (bounds first-page latency). */
const RANK_CAP = 150;
/** Per-request page size when walking AppView cursors to fill RANK_CAP. */
const APPVIEW_PAGE_LIMIT = 100;
/** Max Mastodon URLs pulled from the DB to merge into the ranking. */
const MASTODON_CAP = 100;
/** TTL for the cached ranked list that translates page numbers into slices. */
const CACHE_TTL_MS = 60000;

type TimelineItem = {
  link: Link | null;
  uniqueActorsCount: number;
  mostRecentPostDate: Date;
  posts: LinkPost[];
};

interface RankedEntry {
  url: string;
  /** Combined distinct sharers used for popularity ranking + minShares. */
  rankShares: number;
  /** Epoch ms of the most recent share across sources. */
  mostRecent: number;
  /** Bluesky distinct-sharer count when known (trending/search; not /v1/latest). */
  blueskyShares?: number;
  blueskyItem?: UrlItem;
  /** Mastodon aggregation (link + posts + count) for URLs shared on Mastodon. */
  mastodon?: TimelineItem;
}

interface CachedRanking {
  entries: RankedEntry[];
  expires: number;
}

// Module-level cache. The AppView's own responses are cacheable for ~60s, so a
// short TTL here keeps pagination cheap without serving stale rankings.
const rankingCache = new Map<string, CachedRanking>();

const daysFromTime = (timeMs: number): number =>
  Math.min(90, Math.max(1, Math.ceil(timeMs / ONE_DAY_MS)));

const cacheKey = (
  userId: string,
  service: string,
  sort: string,
  hideReposts: string,
  query: string,
  days: number,
  minShares: number,
): string =>
  [userId, service, sort, hideReposts, query, days, minShares].join("|");

/**
 * Entry point used by the `/links` filter route. Returns the same shape as
 * `filterLinkOccurrences` so the frontend and typed API client are unchanged.
 */
export const getTimeline = async (
  args: FilterArgs,
): Promise<TimelineItem[]> => {
  const {
    userId,
    service = "all",
    selectedList = "all",
    fetch = false,
    url,
    page = 1,
    limit = DEFAULT_LIMIT,
  } = args;

  // Keep the DB path for the sync trigger, specific-link lookups, custom feeds,
  // and Mastodon-only views.
  if (fetch || url || selectedList !== "all" || service === "mastodon") {
    return filterLinkOccurrences(args);
  }

  const account = await db.query.blueskyAccount.findFirst({
    where: eq(blueskyAccount.userId, userId),
  });

  // No Bluesky account, or the AppView isn't configured: fall back to the DB.
  if (!account || !appViewEnabled()) {
    return filterLinkOccurrences(args);
  }

  let ranked: RankedEntry[];
  try {
    ranked = await getRankedEntries(args, account.did);
  } catch (e) {
    // AppView unavailable: degrade to the DB path rather than erroring the view.
    console.error("AppView timeline fetch failed:", e);
    return filterLinkOccurrences(args);
  }

  const offset = (page - 1) * limit;
  const slice = ranked.slice(offset, offset + limit);
  if (slice.length === 0) return [];

  return assemblePage(slice, args, account.did);
};

/** Build (or reuse from cache) the full ranked, merged URL list. */
const getRankedEntries = async (
  args: FilterArgs,
  viewerDid: string,
): Promise<RankedEntry[]> => {
  const service = args.service ?? "all";
  // Match the DB path: anything that isn't "popularity" (e.g. "newest") is recency.
  const sort = args.sort === "popularity" ? "popularity" : "recency";
  const hideReposts = args.hideReposts ?? "include";
  const query = args.query ?? "";
  const days = daysFromTime(args.time ?? ONE_DAY_MS);
  const minShares = args.minShares ?? 0;

  const key = cacheKey(
    args.userId,
    service,
    sort,
    hideReposts,
    query,
    days,
    minShares,
  );
  const cached = rankingCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.entries;
  }

  // --- Bluesky: walk AppView pages up to RANK_CAP ---
  // Throws on AppView failure; getTimeline catches and falls back to the DB.
  const blueskyItems: UrlItem[] = [];
  let cursor: string | undefined;
  while (blueskyItems.length < RANK_CAP) {
    const res = await fetchUrlPage({
      viewer: viewerDid,
      days,
      limit: APPVIEW_PAGE_LIMIT,
      cursor,
      sort,
      query: query || undefined,
      hideReposts,
    });
    blueskyItems.push(...res.items);
    if (res.cold || !res.cursor || res.items.length === 0) break;
    cursor = res.cursor;
  }

  // --- Mastodon: pull a comparable slice from the DB to merge (service=all) ---
  let mastodonResults: TimelineItem[] = [];
  if (service === "all") {
    mastodonResults = await filterLinkOccurrences({
      userId: args.userId,
      time: args.time,
      hideReposts,
      sort,
      query: args.query,
      service: "mastodon",
      page: 1,
      fetch: false,
      selectedList: "all",
      limit: MASTODON_CAP,
      minShares: undefined, // combined threshold is applied after merging
    });
  }

  // --- Merge by canonical URL ---
  const entries = new Map<string, RankedEntry>();

  for (const item of blueskyItems) {
    const recent = toIso(item.mostRecent ?? item.eventTime);
    entries.set(item.url, {
      url: item.url,
      rankShares: item.shares ?? 0,
      mostRecent: recent ? new Date(recent).getTime() : 0,
      blueskyShares: item.shares,
      blueskyItem: item,
    });
  }

  for (const m of mastodonResults) {
    const url = m.link?.url;
    if (!url) continue;
    const mastoRecent = m.mostRecentPostDate
      ? new Date(m.mostRecentPostDate).getTime()
      : 0;
    const existing = entries.get(url);
    if (existing) {
      existing.mastodon = m;
      existing.rankShares += m.uniqueActorsCount;
      existing.mostRecent = Math.max(existing.mostRecent, mastoRecent);
    } else {
      entries.set(url, {
        url,
        rankShares: m.uniqueActorsCount,
        mostRecent: mastoRecent,
        mastodon: m,
      });
    }
  }

  // minShares: drop entries below the threshold when the count is known. For
  // recency-sorted Bluesky-only entries the count is unknown until hydration,
  // so keep them here and filter precisely during page assembly.
  let ranked = Array.from(entries.values());
  if (minShares > 0) {
    ranked = ranked.filter((e) => {
      const countKnown = e.blueskyShares !== undefined || e.mastodon;
      return !countKnown || e.rankShares >= minShares;
    });
  }

  ranked.sort((a, b) =>
    sort === "recency"
      ? b.mostRecent - a.mostRecent
      : b.rankShares - a.rankShares || b.mostRecent - a.mostRecent,
  );

  rankingCache.set(key, { entries: ranked, expires: Date.now() + CACHE_TTL_MS });
  return ranked;
};

/** Hydrate one page of ranked entries into the renderable timeline shape. */
const assemblePage = async (
  slice: RankedEntry[],
  args: FilterArgs,
  viewerDid: string,
): Promise<TimelineItem[]> => {
  const userId = args.userId;
  const days = daysFromTime(args.time ?? ONE_DAY_MS);
  const hideReposts = args.hideReposts ?? "include";
  const minShares = args.minShares ?? 0;

  const blueskyUrls = slice.filter((e) => e.blueskyItem).map((e) => e.url);

  // Individual Bluesky shares for the page's URLs (one batched call).
  let shares: ShareRow[] = [];
  if (blueskyUrls.length > 0) {
    try {
      shares = await fetchHydration({
        viewer: viewerDid,
        days,
        urls: blueskyUrls,
        hideReposts,
      });
    } catch (e) {
      console.error("AppView hydration failed:", e);
    }
  }
  const sharesByUrl = new Map<string, ShareRow[]>();
  for (const s of shares) {
    const list = sharesByUrl.get(s.url);
    if (list) list.push(s);
    else sharesByUrl.set(s.url, [s]);
  }

  // Enrich link metadata (stable id, topics, scrape status) from the DB.
  const sliceUrls = slice.map((e) => e.url);
  const dbLinks = sliceUrls.length
    ? await db.select().from(link).where(inArray(link.url, sliceUrls))
    : [];
  const dbLinkByUrl = new Map<string, Link>(dbLinks.map((l) => [l.url, l]));

  const items: TimelineItem[] = [];
  for (const entry of slice) {
    const urlShares = sharesByUrl.get(entry.url) ?? [];
    const blueskyPosts = urlShares.map((s) => shareRowToLinkPost(s, userId));
    const mastodonPosts = entry.mastodon?.posts ?? [];
    const posts = [...blueskyPosts, ...mastodonPosts].sort(
      (a, b) =>
        new Date(b.postDate).getTime() - new Date(a.postDate).getTime(),
    );

    const blueskyCount = entry.blueskyShares ?? distinctActorCount(urlShares);
    const mastodonCount = entry.mastodon?.uniqueActorsCount ?? 0;
    const uniqueActorsCount = blueskyCount + mastodonCount;

    // Precise minShares filter for entries whose count was unknown at ranking.
    if (minShares > 0 && uniqueActorsCount < minShares) continue;

    const dbLink = dbLinkByUrl.get(entry.url) ?? entry.mastodon?.link ?? null;
    const linkObj = entry.blueskyItem
      ? urlItemToLink(entry.blueskyItem, dbLink)
      : (entry.mastodon?.link ?? null);

    items.push({
      link: linkObj,
      uniqueActorsCount,
      mostRecentPostDate: new Date(entry.mostRecent),
      posts,
    });
  }

  return items;
};
