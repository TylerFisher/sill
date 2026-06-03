import { type SQL, and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  list,
  blueskyAccount,
  mastodonAccount,
  mutePhrase,
  type AboutCard,
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
import { mastodonActorUri, resolveViewer } from "./viewer.js";
import {
  type AppViewNotificationQuery,
  appViewEnabled,
  distinctActorCount,
  fetchByAuthor,
  fetchByPublication,
  fetchHydration,
  fetchNetworkTrending,
  fetchQuery,
  networkFromService,
  type PushShare,
  type PushShareBatch,
  type PushShareSource,
  pushShareBatches,
  type QueryMatch,
  type QueryResponse,
  resolveLeafletPublications,
  resolveRepostSubjects,
  type ShareRow,
  shareRowToLinkPost,
  type TimeWindow,
  toIso,
  type UrlItem,
  urlItemToLink,
} from "./appview.js";
import { serializeProfileDescriptionToHtml } from "./record-mappers/shared.js";
import { sourceIdForList } from "./timeline.js";

const PAGE_SIZE = 10;

/**
 * Resolve the matched Bluesky account's bio (`about.account.description`) into
 * HTML server-side: profile bios are plain text, so we detect their link/mention
 * facets and linkify them for the profile card.
 */
const resolveAboutAccount = (about?: AboutCard): AboutCard | undefined => {
  if (!about?.account?.description) return about;
  return {
    ...about,
    account: {
      ...about.account,
      description: serializeProfileDescriptionToHtml(about.account.description),
    },
  };
};

/**
 * Options for the share collectors.
 * - `ignoreCursor`: ignore each list/account's stored `mostRecentPost*` cursor
 *   and fetch the full default window (last 24h) instead of only what's new
 *   since the last pass. Used by the one-off AppView backfill to seed history;
 *   the steady-state worker leaves it unset so it only ships new posts.
 */
export type FetchLinksOpts = { ignoreCursor?: boolean };

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
  opts?: FetchLinksOpts,
): Promise<PushShareBatch | null> => {
  let masto: PushShareBatch | null = null;
  let bsky: PushShareBatch | null = null;

  if (type === "mastodon") {
    masto = await getLinksFromMastodon(userId, opts);
  } else if (type === "bluesky") {
    bsky = await getLinksFromBluesky(userId, opts);
  } else {
    [masto, bsky] = await Promise.all([
      getLinksFromMastodon(userId, opts),
      getLinksFromBluesky(userId, opts),
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
    // Viewer key: the user's Bluesky DID, or their Mastodon actor URI when
    // they're Mastodon-only (see resolveViewer / getLinksFromMastodon).
    const viewerAccount = await db.query.blueskyAccount.findFirst({
      where: eq(blueskyAccount.userId, userId),
    });
    const viewer =
      viewerAccount?.did ??
      (account.username
        ? mastodonActorUri(account.mastodonInstance.instance, account.username)
        : null);
    if (!viewer) return null;

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
    return shares.length > 0 ? { viewer, shares } : null;
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
// One `POST /v1/query` per evaluation. The AppView AND's the predicate set
// (url/link/post/author/repost/service/shares/list) and returns matching URLs
// with hydrated ShareRows already filtered+sorted. We only post-process two
// things in-memory:
//   - `seenLinks` dedupe (group-local, no server state).
//   - Sill's `mute_phrase` URL-level safety net (in case Sill mutes aren't
//     synced into AppView preferences — defensive only).
//
// Notification cap. The AppView's `limit` maxes at 100 (URLs); within each
// match, items are server-capped at 200 ShareRows.
const NOTIFICATION_DEFAULT_LIMIT = 100;
/** Default `/v1/query` window. `seenLinks` dedupes across polls, so a 24h
 *  trailing window is enough to catch new matches. */
const NOTIFICATION_QUERY_HOURS = 24;
const ONE_HOUR_MS = 3600000;

/**
 * The `/v1/query` window for a notification group: 24h, or the time since the
 * group was created when that's shorter — there's nothing to find before the
 * group existed, so a brand-new group scans only its short lifetime. Floored at
 * 1h (the AppView's minimum bucket).
 */
const queryHours = (createdAt?: Date): number => {
  if (!createdAt) return NOTIFICATION_QUERY_HOURS;
  const hours = Math.ceil(
    Math.max(0, Date.now() - createdAt.getTime()) / ONE_HOUR_MS,
  );
  return Math.max(1, Math.min(NOTIFICATION_QUERY_HOURS, hours));
};

/**
 * Rewrite Sill list-ids to canonical AppView sourceIds and validate the
 * query shape so we don't ship malformed predicates. Unknown predicates are
 * dropped (forward-compatible with future categories the server doesn't yet
 * recognise).
 */
const translateNotificationQueries = async (
  queries: NotificationQuery[],
): Promise<AppViewNotificationQuery[]> => {
  const out: AppViewNotificationQuery[] = [];
  for (const q of queries) {
    const id = q.category.id;
    if (id === "list" && typeof q.value === "string") {
      const sourceId = await sourceIdForList(q.value);
      if (!sourceId) continue;
      out.push({
        category: { id },
        operator: q.operator,
        value: sourceId,
      });
    } else if (
      id === "service" ||
      id === "url" ||
      id === "link" ||
      id === "post" ||
      id === "author" ||
      id === "repost" ||
      id === "shares"
    ) {
      out.push({ category: { id }, operator: q.operator, value: q.value });
    }
  }
  return out;
};

const includesCi = (h: string | null | undefined, n: string): boolean =>
  !!h && h.toLowerCase().includes(n.toLowerCase());

/**
 * Convert one `/v1/query` match into the `MostRecentLinkPosts`-shaped item the
 * notifier and email/RSS renderers expect. The match shape mirrors `UrlItem`
 * for the link half, so `urlItemToLink` maps it cleanly.
 */
const matchToItem = async (
  match: QueryMatch,
  userId: string,
): Promise<MostRecentLinkPosts> => {
  let shares = match.items;
  try {
    shares = await resolveRepostSubjects(shares);
    shares = await resolveLeafletPublications(shares);
  } catch (e) {
    console.error("notification subject resolution failed:", e);
  }
  const posts = shares
    .map((s) => shareRowToLinkPost(s, userId))
    .sort(
      (a, b) =>
        new Date(b.postDate).getTime() - new Date(a.postDate).getTime(),
    );
  return {
    link: urlItemToLink(match, null),
    uniqueActorsCount: match.shares,
    posts,
    avatars: match.avatars,
  };
};

export const evaluateNotifications = async (
  userId: string,
  queries: NotificationQuery[],
  seenLinks: string[] = [],
  /** The group's creation time — caps the query window for new groups. */
  createdAt?: Date,
  /**
   * Cap on URL matches returned. Defaults to the AppView max (100); the
   * test/preview endpoint passes a smaller value for a quick interactive ping.
   */
  candidateLimit: number = NOTIFICATION_DEFAULT_LIMIT,
): Promise<MostRecentLinkPosts[]> => {
  if (!appViewEnabled()) return [];

  const viewer = await resolveViewer(userId);
  if (!viewer) return [];

  const translated = await translateNotificationQueries(queries);
  if (translated.length === 0) return [];

  let response: QueryResponse;
  try {
    response = await fetchQuery({
      viewer,
      hours: queryHours(createdAt),
      limit: Math.min(100, Math.max(1, candidateLimit)),
      queries: translated,
    });
  } catch (e) {
    console.error("AppView /v1/query failed:", e);
    return [];
  }
  if (response.cold) return [];

  const seen = new Set(seenLinks);
  const matches = response.matches.filter((m) => !seen.has(m.url));

  // Sill mute_phrase safety net (URL/title/description only — post-level
  // muting is already covered server-side by `/v1/preferences`).
  const mutePhrases = (await getMutePhrases(userId)).map((p) => p.phrase);
  const allowed = mutePhrases.length
    ? matches.filter(
        (m) =>
          !mutePhrases.some(
            (p) =>
              includesCi(m.url, p) ||
              includesCi(m.title, p) ||
              includesCi(m.description, p),
          ),
      )
    : matches;

  return Promise.all(allowed.map((m) => matchToItem(m, userId)));
};

/**
 * Match-count preview for the `/api/notifications/test` UI. Same `/v1/query`
 * call as `evaluateNotifications`, sized smaller. The endpoint hydrates
 * `items` server-side; for a count we only need the URL list.
 */
export const previewNotificationCount = async (
  userId: string,
  queries: NotificationQuery[],
): Promise<number> => {
  if (!appViewEnabled()) return 0;
  const viewer = await resolveViewer(userId);
  if (!viewer) return 0;

  const translated = await translateNotificationQueries(queries);
  if (translated.length === 0) return 0;

  let response: QueryResponse;
  try {
    response = await fetchQuery({
      viewer,
      hours: NOTIFICATION_QUERY_HOURS,
      limit: 100,
      queries: translated,
    });
  } catch (e) {
    console.error("AppView /v1/query (preview) failed:", e);
    return 0;
  }
  if (response.cold) return 0;

  const mutePhrases = (await getMutePhrases(userId)).map((p) => p.phrase);
  if (mutePhrases.length === 0) return response.matches.length;
  return response.matches.filter(
    (m) =>
      !mutePhrases.some(
        (p) =>
          includesCi(m.url, p) ||
          includesCi(m.title, p) ||
          includesCi(m.description, p),
      ),
  ).length;
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
/**
 * Hydrate AppView UrlItems (from by-domain/by-author) into the renderable shape,
 * eagerly loading each URL's posts for the viewer's network.
 */
const linksFromAppViewItems = async (
  items: UrlItem[],
  viewer: string,
  userId: string,
): Promise<MostRecentLinkPosts[]> => {
  if (items.length === 0) return [];

  let shares = await fetchHydration({
    viewer,
    window: DISCOVERY_WINDOW,
    urls: items.map((i) => i.url),
    hideReposts: "include",
    network: networkFromService("all"),
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
export interface PaginatedLinks {
  links: MostRecentLinkPosts[];
  cursor?: string;
  /** Publisher/journalist summary — first page only (see API.md `about`). */
  about?: AboutCard;
}

/**
 * The same filter set the main `/links` feed exposes, applied to the
 * by-author / by-domain discovery pages. All optional — omit for the defaults
 * (whole 90-day window, all networks, with reposts, popularity sort, no list
 * scope, no minShares).
 */
export interface DiscoveryFilters {
  time?: number; // ms window; omit for the default discovery window
  service?: "mastodon" | "bluesky" | "all";
  hideReposts?: "include" | "exclude" | "only";
  sort?: "popularity" | "recency";
  minShares?: number;
  selectedList?: string; // Sill list id; resolved to a canonical sourceId
  /** by-publication only: a brand on the host (omit → the host's primary). */
  publication?: string;
}

/** ms → AppView TimeWindow (hours for sub-day), else the default discovery window. */
const discoveryWindow = (timeMs?: number): TimeWindow => {
  if (timeMs == null) return DISCOVERY_WINDOW;
  return timeMs < ONE_DAY_MS
    ? { hours: Math.min(23, Math.max(1, Math.ceil(timeMs / ONE_HOUR_MS))) }
    : { days: Math.min(90, Math.max(1, Math.ceil(timeMs / ONE_DAY_MS))) };
};

export const findLinksByDomain = async (
  domain: string,
  pageSize = 10,
  userId?: string,
  cursor?: string,
  filters?: DiscoveryFilters,
): Promise<PaginatedLinks> => {
  if (!userId || !appViewEnabled()) return { links: [] };
  const viewer = await resolveViewer(userId);
  if (!viewer) return { links: [] };
  const sourceId = await sourceIdForList(filters?.selectedList ?? "all");
  const res = await fetchByPublication({
    domain,
    publication: filters?.publication,
    viewer,
    window: discoveryWindow(filters?.time),
    limit: pageSize,
    cursor,
    sourceId,
    network: networkFromService(filters?.service ?? "all"),
    hideReposts: filters?.hideReposts,
    minShares: filters?.minShares,
    sort: filters?.sort,
  });
  const links = await linksFromAppViewItems(res.items, viewer, userId);
  return { links, cursor: res.cursor, about: resolveAboutAccount(res.about) };
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
  cursor?: string,
  filters?: DiscoveryFilters,
): Promise<PaginatedLinks> => {
  if (!userId || !appViewEnabled()) return { links: [] };
  const viewer = await resolveViewer(userId);
  if (!viewer) return { links: [] };
  const sourceId = await sourceIdForList(filters?.selectedList ?? "all");
  const res = await fetchByAuthor({
    author,
    viewer,
    window: discoveryWindow(filters?.time),
    limit: pageSize,
    cursor,
    sourceId,
    network: networkFromService(filters?.service ?? "all"),
    hideReposts: filters?.hideReposts,
    minShares: filters?.minShares,
    sort: filters?.sort,
  });
  const links = await linksFromAppViewItems(res.items, viewer, userId);
  return { links, cursor: res.cursor, about: resolveAboutAccount(res.about) };
};
