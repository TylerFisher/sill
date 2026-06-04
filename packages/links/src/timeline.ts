import { eq } from "drizzle-orm";
import {
  type LinkPost,
  type RenderedLink,
  list as listTable,
  mastodonAccount,
  type MostRecentLinkPosts,
  mastodonInstance,
  db,
} from "@sill/schema";
import {
  appViewEnabled,
  distinctActorCount,
  fetchHydration,
  fetchUrlPage,
  networkFromService,
  resolveLeafletPublications,
  resolveRepostSubjects,
  type ShareRow,
  shareRowToLinkPost,
  type TimeWindow,
  toIso,
  type UrlItem,
  urlItemToLink,
} from "./appview.js";
import type { FilterArgs } from "./links.js";
import { resolveViewer } from "./viewer.js";

/**
 * The `/links` read path, served entirely by the AppView. The worker pushes
 * Mastodon and Bluesky-list/feed shares to the AppView (`POST /v1/shares`),
 * so `/v1/trending` and friends now return a viewer's full network natively —
 * no DB merge, no per-page hydration backfill, no `filterLinkOccurrences`
 * fallback.
 */

const DEFAULT_LIMIT = 10;
const ONE_DAY_MS = 86400000;

/** Default AppView page size for the feed (small for fast first paint). */
const APPVIEW_PAGE_LIMIT = 10;
/** Safety cap on items accumulated in one ranking. */
const RANK_MAX = 300;
/** TTL for the cached ranking (raw items + cursor) used for pagination. */
const CACHE_TTL_MS = 60000;
/**
 * Much shorter TTL when the AppView says the viewer is `cold` (seed still
 * warming after onboarding, so the feed is empty). We must NOT hold an empty
 * cold result for the full minute — the seed can warm within seconds, and the
 * client polls — so we re-probe the AppView almost immediately instead.
 */
const COLD_CACHE_TTL_MS = 3000;

type TimelineItem = {
  link: RenderedLink | null;
  uniqueActorsCount: number;
  mostRecentPostDate: Date;
  posts: LinkPost[];
  avatars?: string[];
};

/**
 * `getTimeline` result. `cold` is the AppView's signal that the viewer's seed is
 * still warming (an empty feed right after onboarding is expected, not "no
 * links"); the client uses it to show a seeding state and keep polling.
 */
export type TimelineResult = {
  items: TimelineItem[];
  cold: boolean;
};

interface RankedEntry {
  url: string;
  /** Distinct sharers (from the AppView item) — used for ranking + minShares. */
  shares: number;
  /** Epoch ms of the most recent share. */
  mostRecent: number;
  /** The AppView item carrying metadata + sharers + avatars. */
  item: UrlItem;
}

interface CachedRanking {
  items: UrlItem[];
  cursor: string | undefined;
  exhausted: boolean;
  sort: "popularity" | "recency";
  minShares: number;
  expires: number;
  /** The AppView reported the viewer as cold (seed still warming). */
  cold: boolean;
}

const rankingCache = new Map<string, CachedRanking>();

/** Trailing-slash-insensitive key so URL variants merge as one. */
const urlMergeKey = (url: string): string => url.replace(/\/+$/, "");

/**
 * Identity of one share, for deduping when we render posts inside a card.
 * A post and its reposts share `postUrl` (so groupBy(postUrl) collapses them
 * into one rendered card with all reposters listed) — include the sharer in
 * the key so distinct reposters are kept.
 */
const shareDedupeKey = (p: LinkPost): string =>
  `${p.postUrl} ${p.repostActorHandle ?? p.actorHandle ?? ""}`;

/**
 * Look up the AppView `?sourceId=` value for a Sill list id, or undefined for
 * `"all"`. Bluesky feeds/lists pass the at-URI verbatim; Mastodon lists pass
 * `mastodon-list://<instance>/<id>` (canonical form expected by the AppView).
 */
export const sourceIdForList = async (
  listId: string,
): Promise<string | undefined> => {
  if (!listId || listId === "all") return undefined;
  const row = await db
    .select({
      uri: listTable.uri,
      blueskyAccountId: listTable.blueskyAccountId,
      mastodonAccountId: listTable.mastodonAccountId,
      instance: mastodonInstance.instance,
    })
    .from(listTable)
    .leftJoin(
      mastodonAccount,
      eq(listTable.mastodonAccountId, mastodonAccount.id),
    )
    .leftJoin(
      mastodonInstance,
      eq(mastodonAccount.instanceId, mastodonInstance.id),
    )
    .where(eq(listTable.id, listId))
    .limit(1)
    .then((r) => r[0]);
  if (!row) return undefined;
  if (row.blueskyAccountId) return row.uri;
  if (row.mastodonAccountId && row.instance) {
    return `mastodon-list://${row.instance}/${row.uri}`;
  }
  return undefined;
};

const HOUR_MS = 3600000;

/** Derive the AppView time window from a millisecond span: sub-day → hours. */
const timeWindow = (timeMs: number): TimeWindow =>
  timeMs < ONE_DAY_MS
    ? { hours: Math.min(23, Math.max(1, Math.ceil(timeMs / HOUR_MS))) }
    : { days: Math.min(90, Math.max(1, Math.ceil(timeMs / ONE_DAY_MS))) };

const windowKey = (w: TimeWindow): string =>
  w.hours != null ? `h${w.hours}` : `d${w.days ?? 1}`;

const cacheKey = (
  userId: string,
  sort: string,
  hideReposts: string,
  query: string,
  window: string,
  minShares: number,
  sourceId: string,
  network: string,
): string =>
  [userId, sort, hideReposts, query, window, minShares, sourceId, network].join(
    "|",
  );

/** Up to `limit` distinct sharer avatars from a post set, for a face pile. */
const avatarsFromPosts = (posts: LinkPost[], limit = 3): string[] => {
  const seen = new Set<string>();
  const avatars: string[] = [];
  for (const p of posts) {
    const avatar = p.repostActorAvatarUrl ?? p.actorAvatarUrl;
    const id = p.repostActorHandle ?? p.actorHandle;
    if (!avatar || seen.has(id)) continue;
    seen.add(id);
    avatars.push(avatar);
    if (avatars.length >= limit) break;
  }
  return avatars;
};

const buildEntries = (c: CachedRanking): RankedEntry[] => {
  const entries = new Map<string, RankedEntry>();
  for (const item of c.items) {
    const recent = toIso(item.mostRecent ?? item.eventTime);
    const key = urlMergeKey(item.url);
    const shares = item.shares ?? item.sharers?.length ?? 0;
    const existing = entries.get(key);
    if (existing && existing.shares >= shares) continue;
    entries.set(key, {
      url: item.url,
      shares,
      mostRecent: recent ? new Date(recent).getTime() : 0,
      item,
    });
  }
  let ranked = Array.from(entries.values());
  if (c.minShares > 0) {
    ranked = ranked.filter((e) => e.shares >= c.minShares);
  }
  ranked.sort((a, b) =>
    c.sort === "recency"
      ? b.mostRecent - a.mostRecent
      : b.shares - a.shares || b.mostRecent - a.mostRecent,
  );
  return ranked;
};

/**
 * Read entry for `/links`. Returns the same shape as the old DB path so the
 * frontend and typed API client are unchanged.
 */
export const getTimeline = async (
  args: FilterArgs,
): Promise<TimelineResult> => {
  const {
    userId,
    selectedList = "all",
    fetch = false,
    url,
    page = 1,
    limit = DEFAULT_LIMIT,
  } = args;

  // Trigger an ingest pass (worker-style push to /v1/shares). We don't read DB
  // tables here; the caller is asking us to nudge the AppView and read again.
  if (fetch) {
    const { fetchLinks } = await import("./links.js");
    const { pushShareBatches } = await import("./appview.js");
    try {
      const batch = await fetchLinks(userId);
      if (batch) await pushShareBatches([batch]);
    } catch (e) {
      console.error(e);
    }
  }

  if (!appViewEnabled()) return { items: [], cold: false };

  const viewer = await resolveViewer(userId);
  if (!viewer) return { items: [], cold: false };

  const sourceId = await sourceIdForList(selectedList);

  // On-demand expansion: hydrate one URL's posts when the card opens. The
  // expand path is never cold (it only runs once the feed has rendered).
  if (url) {
    return { items: await getPostsForUrl(args, viewer, sourceId), cold: false };
  }

  let ranked: RankedEntry[];
  let cold: boolean;
  try {
    ({ entries: ranked, cold } = await getRankedEntries(
      args,
      viewer,
      page * limit,
      sourceId,
    ));
  } catch (e) {
    console.error("AppView timeline fetch failed:", e);
    return { items: [], cold: false };
  }

  const offset = (page - 1) * limit;
  const slice = ranked.slice(offset, offset + limit);
  if (slice.length === 0) return { items: [], cold };

  return { items: await assemblePage(slice, args), cold };
};

/**
 * Eager variant: each row comes back with its `posts` hydrated. Used by
 * server-side consumers (digests, notifications) where we need posts up front.
 */
export const getMergedOccurrences = async (
  args: FilterArgs,
): Promise<TimelineItem[]> => {
  const {
    userId,
    selectedList = "all",
    page = 1,
    limit = DEFAULT_LIMIT,
  } = args;

  if (!appViewEnabled()) return [];

  const viewer = await resolveViewer(userId);
  if (!viewer) return [];

  const sourceId = await sourceIdForList(selectedList);

  let ranked: RankedEntry[];
  try {
    ({ entries: ranked } = await getRankedEntries(
      args,
      viewer,
      page * limit,
      sourceId,
    ));
  } catch (e) {
    console.error("AppView merged occurrences failed:", e);
    return [];
  }

  const offset = (page - 1) * limit;
  const slice = ranked.slice(offset, offset + limit);
  if (slice.length === 0) return [];

  return hydratePage(slice, args, viewer, sourceId);
};

/**
 * Hydrate one URL's posts for the on-demand expand. Returns a one-item array
 * matching the list-row shape so the frontend renders the same way.
 */
const getPostsForUrl = async (
  args: FilterArgs,
  viewerDid: string,
  sourceId: string | undefined,
): Promise<TimelineItem[]> => {
  const url = args.url;
  if (!url) return [];
  const window = timeWindow(args.time ?? ONE_DAY_MS);
  const hideReposts = args.hideReposts ?? "include";
  const network = networkFromService(args.service);

  let posts: LinkPost[] = [];
  let count = 0;
  let item: UrlItem | undefined;
  try {
    let shares = await fetchHydration({
      viewer: viewerDid,
      window,
      urls: [url],
      hideReposts,
      sourceId,
      network,
    });
    shares = await resolveRepostSubjects(shares);
    shares = await resolveLeafletPublications(shares);
    posts = shares.map((s) => shareRowToLinkPost(s, args.userId));
    count = distinctActorCount(shares);
    // Dedupe shares: a post + its reposts share `postUrl`; keep distinct
    // (postUrl, sharer) pairs so reposters aren't collapsed.
    const seen = new Set<string>();
    posts = posts
      .filter((p) => {
        const key = shareDedupeKey(p);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.postDate).getTime() - new Date(a.postDate).getTime(),
      );
  } catch (e) {
    console.error("AppView hydration failed:", e);
  }

  return [
    {
      link: item ? urlItemToLink(item, null) : { id: "", url, title: "", description: null, imageUrl: null, giftUrl: null, metadata: null, scraped: false, publishedDate: null, authors: null, siteName: null, topics: null },
      uniqueActorsCount: count,
      mostRecentPostDate: posts[0]
        ? new Date(`${posts[0].postDate}Z`)
        : new Date(),
      posts,
      avatars: avatarsFromPosts(posts),
    },
  ];
};

/**
 * Walk AppView pages until we have enough ranked entries for the requested
 * page. Result is cached so within-window paginations don't re-walk.
 */
const getRankedEntries = async (
  args: FilterArgs,
  viewerDid: string,
  needed: number,
  sourceId: string | undefined,
): Promise<{ entries: RankedEntry[]; cold: boolean }> => {
  const sort: "popularity" | "recency" =
    args.sort === "newest" || args.sort === "recency"
      ? "recency"
      : "popularity";
  const hideReposts = args.hideReposts ?? "include";
  const query = args.query ?? "";
  const window = timeWindow(args.time ?? ONE_DAY_MS);
  const minShares = args.minShares ?? 0;
  const network = networkFromService(args.service);

  const appViewPageLimit = Math.min(
    100,
    Math.max(1, args.appViewPageLimit ?? APPVIEW_PAGE_LIMIT),
  );

  const key = cacheKey(
    args.userId,
    sort,
    hideReposts,
    query,
    windowKey(window),
    minShares,
    sourceId ?? "",
    network ?? "",
  );

  let cached = rankingCache.get(key);
  if (!cached || cached.expires <= Date.now()) {
    const firstPage = await fetchUrlPage({
      viewer: viewerDid,
      window,
      limit: appViewPageLimit,
      query: query || undefined,
      sort,
      hideReposts,
      sourceId,
      network,
      // Pre-filter server-side (AppView applies it when >1) so pages come back
      // already above threshold instead of `buildEntries` thinning each page and
      // forcing extra page-walks; `buildEntries` still filters as a backstop.
      minShares,
    });
    const cold = firstPage.cold === true;
    cached = {
      items: firstPage.items,
      cursor:
        cold || !firstPage.cursor || firstPage.items.length === 0
          ? undefined
          : firstPage.cursor,
      exhausted: cold || !firstPage.cursor || firstPage.items.length === 0,
      sort,
      minShares,
      // Cold results expire fast so the next poll re-probes the warming seed
      // rather than serving the blank feed for the full minute.
      expires: Date.now() + (cold ? COLD_CACHE_TTL_MS : CACHE_TTL_MS),
      cold,
    };
    rankingCache.set(key, cached);
  }

  let ranked = buildEntries(cached);
  while (
    ranked.length < needed &&
    !cached.exhausted &&
    cached.items.length < RANK_MAX
  ) {
    const next = await fetchUrlPage({
      viewer: viewerDid,
      window,
      limit: appViewPageLimit,
      cursor: cached.cursor,
      query: query || undefined,
      sort,
      hideReposts,
      sourceId,
      network,
      minShares,
    });
    cached.items.push(...next.items);
    if (!next.cursor || next.items.length === 0) {
      cached.exhausted = true;
      cached.cursor = undefined;
    } else {
      cached.cursor = next.cursor;
    }
    ranked = buildEntries(cached);
  }

  return { entries: ranked, cold: cached.cold };
};

/**
 * Build one page of list rows from the ranked entries — no hydration. Each
 * row carries the share count + face-pile avatars directly from the AppView
 * item; posts are fetched on demand when a card is expanded.
 */
const assemblePage = async (
  slice: RankedEntry[],
  args: FilterArgs,
): Promise<TimelineItem[]> => {
  const minShares = args.minShares ?? 0;
  const items: TimelineItem[] = [];
  for (const entry of slice) {
    if (minShares > 0 && entry.shares < minShares) continue;
    items.push({
      link: urlItemToLink(entry.item, null),
      uniqueActorsCount: entry.shares,
      mostRecentPostDate: new Date(entry.mostRecent),
      posts: [], // hydrated on demand
      avatars: entry.item.avatars,
    });
  }
  return items;
};

/**
 * Eager variant of `assemblePage`: one batched `/v1/hydration` call fills in
 * the posts for the whole page. Used by `getMergedOccurrences` (digests).
 */
const hydratePage = async (
  slice: RankedEntry[],
  args: FilterArgs,
  viewerDid: string,
  sourceId: string | undefined,
): Promise<TimelineItem[]> => {
  const userId = args.userId;
  const window = timeWindow(args.time ?? ONE_DAY_MS);
  const hideReposts = args.hideReposts ?? "include";
  const minShares = args.minShares ?? 0;
  const network = networkFromService(args.service);

  const urls = slice.map((e) => e.url);
  let shares: ShareRow[] = [];
  if (urls.length > 0) {
    try {
      shares = await fetchHydration({
        viewer: viewerDid,
        window,
        urls,
        hideReposts,
        sourceId,
        network,
      });
      shares = await resolveRepostSubjects(shares);
      shares = await resolveLeafletPublications(shares);
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

  const items: TimelineItem[] = [];
  for (const entry of slice) {
    const urlShares = sharesByUrl.get(entry.url) ?? [];
    let posts = urlShares.map((s) => shareRowToLinkPost(s, userId));
    const seen = new Set<string>();
    posts = posts
      .filter((p) => {
        const key = shareDedupeKey(p);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.postDate).getTime() - new Date(a.postDate).getTime(),
      );

    if (minShares > 0 && entry.shares < minShares) continue;

    items.push({
      link: urlItemToLink(entry.item, null),
      uniqueActorsCount: entry.shares,
      mostRecentPostDate: new Date(entry.mostRecent),
      posts,
      avatars: avatarsFromPosts(posts),
    });
  }
  return items;
};

// Re-export for files that referenced these helpers from timeline.
export type { MostRecentLinkPosts };
