import { eq, inArray } from "drizzle-orm";
import { blueskyAccount, db, link, type Link, type LinkPost } from "@sill/schema";
import {
  appViewEnabled,
  distinctActorCount,
  fetchHydration,
  fetchUrlPage,
  resolveRepostSubjects,
  type ShareRow,
  shareRowToLinkPost,
  type TimeWindow,
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

/**
 * Per-AppView-call page size. We fetch one page for the first paint and walk
 * more cursors only when the user paginates past what's cached — the second
 * trending page can be multiple seconds server-side, so we avoid it upfront.
 */
const APPVIEW_PAGE_LIMIT = 50;
/** Safety cap on total AppView items accumulated for one ranking. */
const RANK_MAX = 300;
/** Max Mastodon URLs pulled from the DB to merge into the ranking. */
const MASTODON_CAP = 100;
/** TTL for the cached ranking (raw items + cursor) used for pagination. */
const CACHE_TTL_MS = 60000;

type TimelineItem = {
  link: Link | null;
  uniqueActorsCount: number;
  mostRecentPostDate: Date;
  posts: LinkPost[];
  avatars?: string[];
};

/** Up to `limit` distinct sharer avatars from a post set, for a face pile. */
const avatarsFromPosts = (posts: LinkPost[], limit = 3): string[] => {
  const seen = new Set<string>();
  const avatars: string[] = [];
  for (const p of posts) {
    // The reposter is the network member who shared it; otherwise the author.
    const avatar = p.repostActorAvatarUrl ?? p.actorAvatarUrl;
    const id = p.repostActorHandle ?? p.actorHandle;
    if (!avatar || seen.has(id)) continue;
    seen.add(id);
    avatars.push(avatar);
    if (avatars.length >= limit) break;
  }
  return avatars;
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
  blueskyItems: UrlItem[];
  blueskyCursor: string | undefined;
  blueskyExhausted: boolean;
  mastodon: TimelineItem[];
  sort: "popularity" | "recency";
  minShares: number;
  expires: number;
}

// Module-level cache holding the raw fetched items + the AppView cursor, so
// pagination extends the same fetch rather than re-fetching from page 1. The
// merged/sorted entries are recomputed per request (cheap: ~1ms).
const rankingCache = new Map<string, CachedRanking>();

/** Merge Bluesky + Mastodon items into ranked entries (the join is ~1ms). */
const buildEntries = (c: CachedRanking): RankedEntry[] => {
  const entries = new Map<string, RankedEntry>();

  for (const item of c.blueskyItems) {
    const recent = toIso(item.mostRecent ?? item.eventTime);
    entries.set(item.url, {
      url: item.url,
      rankShares: item.shares ?? 0,
      mostRecent: recent ? new Date(recent).getTime() : 0,
      blueskyShares: item.shares,
      blueskyItem: item,
    });
  }

  for (const m of c.mastodon) {
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

  let ranked = Array.from(entries.values());
  // minShares: drop entries below the threshold when the count is known.
  if (c.minShares > 0) {
    ranked = ranked.filter((e) => {
      const countKnown = e.blueskyShares !== undefined || e.mastodon;
      return !countKnown || e.rankShares >= c.minShares;
    });
  }

  ranked.sort((a, b) =>
    c.sort === "recency"
      ? b.mostRecent - a.mostRecent
      : b.rankShares - a.rankShares || b.mostRecent - a.mostRecent,
  );
  return ranked;
};

const HOUR_MS = 3600000;

/** Derive the AppView time window from a millisecond span: sub-day → hours. */
const timeWindow = (timeMs: number): TimeWindow =>
  timeMs < ONE_DAY_MS
    ? { hours: Math.min(23, Math.max(1, Math.ceil(timeMs / HOUR_MS))) }
    : { days: Math.min(90, Math.max(1, Math.ceil(timeMs / ONE_DAY_MS))) };

/** Stable cache-key fragment for a window (distinguishes 3h vs 6h vs 1d). */
const windowKey = (w: TimeWindow): string =>
  w.hours != null ? `h${w.hours}` : `d${w.days ?? 1}`;

const cacheKey = (
  userId: string,
  service: string,
  sort: string,
  hideReposts: string,
  query: string,
  window: string,
  minShares: number,
): string =>
  [userId, service, sort, hideReposts, query, window, minShares].join("|");

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

  // The sync trigger ingests + reads the DB.
  if (fetch) return filterLinkOccurrences(args);

  const account = await db.query.blueskyAccount.findFirst({
    where: eq(blueskyAccount.userId, userId),
  });

  // Whether this request should be served from the AppView at all.
  const useAppView =
    !!account &&
    appViewEnabled() &&
    selectedList === "all" &&
    service !== "mastodon";

  // On-demand expansion: hydrate one URL's posts when a card is opened.
  if (url) {
    return account && useAppView
      ? getPostsForUrl(args, account.did)
      : filterLinkOccurrences(args);
  }

  // Custom feeds, Mastodon-only, no Bluesky account, or AppView off → DB.
  if (!account || !useAppView) {
    return filterLinkOccurrences(args);
  }

  let ranked: RankedEntry[];
  try {
    // Only fetch enough AppView pages to cover the requested page.
    ranked = await getRankedEntries(args, account.did, page * limit);
  } catch (e) {
    // AppView unavailable: degrade to the DB path rather than erroring the view.
    console.error("AppView timeline fetch failed:", e);
    return filterLinkOccurrences(args);
  }

  const offset = (page - 1) * limit;
  const slice = ranked.slice(offset, offset + limit);
  if (slice.length === 0) return [];

  // Both trending and /v1/latest carry shares + avatars, so the list renders
  // lazily (face pile from the item, posts hydrated on expand) for either sort.
  return assemblePage(slice, args);
};

/**
 * Same merged AppView + DB Mastodon ranking as the timeline, but **eager** —
 * each row comes back with its posts hydrated. For server-side consumers that
 * need the posts up front (digests, and later notifications) rather than the
 * lazy-on-expand list view. Falls back to the DB for list/Mastodon-only views,
 * users without a Bluesky account, or when the AppView is unavailable.
 */
export const getMergedOccurrences = async (
  args: FilterArgs,
): Promise<TimelineItem[]> => {
  const {
    userId,
    service = "all",
    selectedList = "all",
    page = 1,
    limit = DEFAULT_LIMIT,
  } = args;

  const account = await db.query.blueskyAccount.findFirst({
    where: eq(blueskyAccount.userId, userId),
  });
  const useAppView =
    !!account &&
    appViewEnabled() &&
    selectedList === "all" &&
    service !== "mastodon";

  if (!account || !useAppView) {
    return filterLinkOccurrences(args);
  }

  let ranked: RankedEntry[];
  try {
    ranked = await getRankedEntries(args, account.did, page * limit);
  } catch (e) {
    console.error("AppView merged occurrences failed:", e);
    return filterLinkOccurrences(args);
  }

  const offset = (page - 1) * limit;
  const slice = ranked.slice(offset, offset + limit);
  if (slice.length === 0) return [];

  return hydratePage(slice, args, account.did);
};

/**
 * Hydrate the individual posts for a single URL, on demand (when a card is
 * expanded). Bluesky posts come from the AppView hydration endpoint; Mastodon
 * posts from the DB. Returns a single-item array shaped like the list rows.
 */
const getPostsForUrl = async (
  args: FilterArgs,
  viewerDid: string,
): Promise<TimelineItem[]> => {
  const url = args.url;
  if (!url) return [];
  const service = args.service ?? "all";
  const window = timeWindow(args.time ?? ONE_DAY_MS);
  const hideReposts = args.hideReposts ?? "include";

  let blueskyPosts: LinkPost[] = [];
  let blueskyCount = 0;
  if (service !== "mastodon") {
    try {
      let shares = await fetchHydration({
        viewer: viewerDid,
        window,
        urls: [url],
        hideReposts,
      });
      shares = await resolveRepostSubjects(shares);
      blueskyPosts = shares.map((s) => shareRowToLinkPost(s, args.userId));
      blueskyCount = distinctActorCount(shares);
    } catch (e) {
      console.error("AppView hydration failed:", e);
    }
  }

  // Mastodon posts for this URL (also merged when service is "all").
  let mastodonItem: TimelineItem | undefined;
  if (service !== "bluesky") {
    const res = await filterLinkOccurrences({
      userId: args.userId,
      time: args.time,
      hideReposts,
      sort: args.sort,
      query: args.query,
      service: "mastodon",
      page: 1,
      fetch: false,
      selectedList: "all",
      url,
      limit: 1,
    });
    mastodonItem = res[0];
  }

  const posts = [...blueskyPosts, ...(mastodonItem?.posts ?? [])].sort(
    (a, b) => new Date(b.postDate).getTime() - new Date(a.postDate).getTime(),
  );

  const dbLink =
    (await db.select().from(link).where(eq(link.url, url)))[0] ??
    mastodonItem?.link ??
    null;

  return [
    {
      link: dbLink,
      uniqueActorsCount: blueskyCount + (mastodonItem?.uniqueActorsCount ?? 0),
      mostRecentPostDate: posts[0]
        ? new Date(`${posts[0].postDate}Z`)
        : new Date(),
      posts,
      avatars: avatarsFromPosts(posts),
    },
  ];
};

/**
 * Build the ranked, merged list, fetching AppView pages incrementally until it
 * covers `needed` entries (or the network is exhausted). The first paint costs
 * a single AppView call; deeper pages walk more cursors, reusing the cache.
 */
const getRankedEntries = async (
  args: FilterArgs,
  viewerDid: string,
  needed: number,
): Promise<RankedEntry[]> => {
  const service = args.service ?? "all";
  // Default to popularity (like the DB path); only an explicit recency/newest
  // sort flips to recency. An absent sort (e.g. digests) means popularity.
  const sort: "popularity" | "recency" =
    args.sort === "newest" || args.sort === "recency"
      ? "recency"
      : "popularity";
  const hideReposts = args.hideReposts ?? "include";
  const query = args.query ?? "";
  const window = timeWindow(args.time ?? ONE_DAY_MS);
  const minShares = args.minShares ?? 0;

  const key = cacheKey(
    args.userId,
    service,
    sort,
    hideReposts,
    query,
    windowKey(window),
    minShares,
  );

  const applyPage = (c: CachedRanking, res: { items: UrlItem[]; cursor?: string; cold?: true }) => {
    c.blueskyItems.push(...res.items);
    if (res.cold || !res.cursor || res.items.length === 0) {
      c.blueskyExhausted = true;
    } else {
      c.blueskyCursor = res.cursor;
    }
  };

  // Fresh ranking: fetch the Mastodon side and the first AppView page in
  // parallel (the AppView call dominates; don't make Mastodon wait behind it).
  let cached = rankingCache.get(key);
  if (!cached || cached.expires <= Date.now()) {
    const [mastodon, firstPage] = await Promise.all([
      service === "all"
        ? filterLinkOccurrences({
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
            minShares: undefined, // combined threshold applied after merging
          })
        : Promise.resolve([] as TimelineItem[]),
      fetchUrlPage({
        viewer: viewerDid,
        window,
        limit: APPVIEW_PAGE_LIMIT,
        query: query || undefined,
        sort,
        hideReposts,
      }),
    ]);
    cached = {
      blueskyItems: [],
      blueskyCursor: undefined,
      blueskyExhausted: false,
      mastodon,
      sort,
      minShares,
      expires: Date.now() + CACHE_TTL_MS,
    };
    applyPage(cached, firstPage);
    rankingCache.set(key, cached);
  }

  // Walk additional AppView pages only if this page needs more entries.
  // Throws on AppView failure; getTimeline catches and falls back to the DB.
  let ranked = buildEntries(cached);
  while (
    ranked.length < needed &&
    !cached.blueskyExhausted &&
    cached.blueskyItems.length < RANK_MAX
  ) {
    applyPage(
      cached,
      await fetchUrlPage({
        viewer: viewerDid,
        window,
        limit: APPVIEW_PAGE_LIMIT,
        cursor: cached.blueskyCursor,
        query: query || undefined,
        sort,
        hideReposts,
      }),
    );
    ranked = buildEntries(cached);
  }

  return ranked;
};

/**
 * Build one page of list rows from the ranked entries — no hydration. Each row
 * carries the share count and a face-pile of avatars (Bluesky avatars from
 * trending + a few Mastodon avatars); the actual posts are fetched on demand
 * via `getPostsForUrl` when the card is expanded.
 */
const assemblePage = async (
  slice: RankedEntry[],
  args: FilterArgs,
): Promise<TimelineItem[]> => {
  const minShares = args.minShares ?? 0;

  // The AppView already carries URL metadata. Only consult the DB as a fallback
  // for Bluesky URLs the AppView hasn't scraped (no title). Merged URLs also
  // reuse the Mastodon row below, so those keep a stable id/topics.
  const fallbackUrls = slice
    .filter((e) => e.blueskyItem && !e.blueskyItem.title)
    .map((e) => e.url);
  const dbLinks = fallbackUrls.length
    ? await db.select().from(link).where(inArray(link.url, fallbackUrls))
    : [];
  const dbLinkByUrl = new Map<string, Link>(dbLinks.map((l) => [l.url, l]));

  const items: TimelineItem[] = [];
  for (const entry of slice) {
    const blueskyCount = entry.blueskyShares ?? 0;
    const mastodonCount = entry.mastodon?.uniqueActorsCount ?? 0;
    const uniqueActorsCount = blueskyCount + mastodonCount;

    if (minShares > 0 && uniqueActorsCount < minShares) continue;

    const blueskyAvatars = entry.blueskyItem?.avatars ?? [];
    const mastodonAvatars = entry.mastodon
      ? avatarsFromPosts(entry.mastodon.posts)
      : [];
    const avatars = [...blueskyAvatars, ...mastodonAvatars].slice(0, 3);

    const dbLink = dbLinkByUrl.get(entry.url) ?? entry.mastodon?.link ?? null;
    const linkObj = entry.blueskyItem
      ? urlItemToLink(entry.blueskyItem, dbLink)
      : (entry.mastodon?.link ?? null);

    items.push({
      link: linkObj,
      uniqueActorsCount,
      mostRecentPostDate: new Date(entry.mostRecent),
      posts: [], // hydrated on demand when the card is expanded
      avatars,
    });
  }

  return items;
};

/**
 * Eager version of `assemblePage`: hydrates the Bluesky posts for the page
 * (one batched `/v1/hydration` call) and merges them with the Mastodon posts,
 * so each row comes back with its full `posts`. Used by `getMergedOccurrences`.
 */
const hydratePage = async (
  slice: RankedEntry[],
  args: FilterArgs,
  viewerDid: string,
): Promise<TimelineItem[]> => {
  const userId = args.userId;
  const window = timeWindow(args.time ?? ONE_DAY_MS);
  const hideReposts = args.hideReposts ?? "include";
  const minShares = args.minShares ?? 0;

  const blueskyUrls = slice.filter((e) => e.blueskyItem).map((e) => e.url);
  let shares: ShareRow[] = [];
  if (blueskyUrls.length > 0) {
    try {
      shares = await fetchHydration({
        viewer: viewerDid,
        window,
        urls: blueskyUrls,
        hideReposts,
      });
      shares = await resolveRepostSubjects(shares);
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

  // DB only as a metadata fallback for Bluesky URLs the AppView hasn't titled.
  const fallbackUrls = slice
    .filter((e) => e.blueskyItem && !e.blueskyItem.title)
    .map((e) => e.url);
  const dbLinks = fallbackUrls.length
    ? await db.select().from(link).where(inArray(link.url, fallbackUrls))
    : [];
  const dbLinkByUrl = new Map<string, Link>(dbLinks.map((l) => [l.url, l]));

  const items: TimelineItem[] = [];
  for (const entry of slice) {
    const urlShares = sharesByUrl.get(entry.url) ?? [];
    const blueskyPosts = urlShares.map((s) => shareRowToLinkPost(s, userId));
    const mastodonPosts = entry.mastodon?.posts ?? [];
    const posts = [...blueskyPosts, ...mastodonPosts].sort(
      (a, b) => new Date(b.postDate).getTime() - new Date(a.postDate).getTime(),
    );

    const blueskyCount = entry.blueskyShares ?? distinctActorCount(urlShares);
    const mastodonCount = entry.mastodon?.uniqueActorsCount ?? 0;
    const uniqueActorsCount = blueskyCount + mastodonCount;

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
      avatars: avatarsFromPosts(posts),
    });
  }

  return items;
};
