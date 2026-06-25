import { uuidv7 } from "uuidv7-js";
import type { AboutCard, Link, RenderedLink } from "@sill/schema";
import {
  decodeHtmlEntities,
  decodeHtmlEntitiesMaybe,
} from "./html-entities.js";
import {
  isEmptyRecord,
  publicImageUrl,
  toDbDate,
  toIso,
} from "./record-mappers/shared.js";

/**
 * Client for the Sill AppView API — a read-only HTTP index over atproto that
 * answers "what URLs are the people I follow sharing?". See API.md for the
 * full contract. This module wraps the REST endpoints we use for the Bluesky
 * timeline. The per-collection `ShareRow` → `linkPostDenormalized` mappers live
 * in `./record-mappers/` (dispatched by `shareRowToLinkPost`, re-exported
 * below); this file keeps the HTTP client, response types, Slingshot
 * enrichment, and the `UrlItem` → `link` mapping.
 */

// Re-exported so existing `./appview.js` importers keep working after the
// mapper extraction.
export { shareRowToLinkPost } from "./record-mappers/index.js";
export { toDbDate, toIso };

const APPVIEW_TIMEOUT_MS = 60000; // server allows up to 60s during backfill

/** Whether the AppView is configured. When false, callers fall back to the DB. */
export const appViewEnabled = (): boolean =>
  Boolean(process.env.APPVIEW_API_URL && process.env.APPVIEW_API_KEY);

// --- Response shapes (mirror API.md §4) ---

export interface Sharer {
  did: string;
  handle?: string;
  name?: string;
}

export interface UrlItem {
  url: string;
  shares?: number; // distinct sharers (all aggregating endpoints)
  avatars?: string[]; // up to 3 sharer avatars for a face pile
  /**
   * Up to 1000 distinct accounts that shared this URL within the window,
   * most-recent first. Emitted by `/v1/trending`, `/v1/latest`, `/v1/search`,
   * `/v1/by-author`, `/v1/by-domain` (NOT `/v1/network-trending`). Lets us
   * dedupe Bluesky sharers across sources (AppView following + DB Bluesky
   * lists) before counting — same person in both shouldn't count twice.
   */
  sharers?: Sharer[];
  mostRecent?: string; // latest share time (trending/search)
  eventTime?: string; // latest share time on /v1/latest (in place of mostRecent)
  giftUrl?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
  /** Article author(s) as one display string (e.g. "Jane Doe, John Smith"). */
  byline?: string;
  /** The same authors split into individual names — link each separately.
   *  Omitted when none scraped; fall back to `byline`. */
  authors?: string[];
  publishedAt?: string;
  /** Publisher brand icon (app-icon/favicon) for this URL; show next to the URL. */
  publisherIcon?: string;
  /** Fallback publisher name (the domain's primary publisher) for when the
   *  article's own `siteName` didn't scrape — prefer `siteName` when present. */
  publisherName?: string;
  /** Popfeed reviews only: the reviewed work's type (e.g. `movie`, `tvShow`,
   *  `game`), used as the `{type}` segment of the popfeed.social card URL. When
   *  absent, `popfeedWorkUrl` falls back to the URN's provider segment. */
  workType?: string;
  // network-trending only: the most-shared post for this URL, hydrated.
  // `shares` here = that post's reposts + quotes ("Most shared").
  topPost?: ShareRow & { shares: number };
}

export interface SubjectPost {
  atUri: string;
  record: string; // raw atproto record, JSON-stringified
  actorDid: string;
  actorHandle?: string;
  actorName?: string;
  actorAvatar?: string;
  // Present when this subject is itself a quote/repost — the post it references.
  // Mainly: a repost OF a quote post, where `subject` is the quote post and
  // `subject.subject` is the quoted post. Resolution stops at this second level.
  subject?: SubjectPost;
}

export interface ShareRow {
  url: string;
  actorDid: string;
  collection: string; // e.g. "app.bsky.feed.post" | "app.bsky.feed.repost"
  rkey: string;
  atUri: string;
  eventTime: string;
  record: string; // raw atproto record, JSON-stringified
  actorHandle?: string;
  actorName?: string;
  actorAvatar?: string;
  giftUrl?: string;
  subject?: SubjectPost; // resolved referenced post for reposts & quotes
  // For replies (`app.bsky.feed.post` with a reply.parent): the post being
  // replied to, resolved server-side. Bluesky only. Shown above the reply.
  parent?: SubjectPost;
  // Canonical source attribution: which feed/list/follows surfaced this share
  // to the viewer. `"follows"`, a Bluesky feed/list at-URI, or
  // `mastodon-list://<instance>/<id>` — same strings as the `?sourceId=` filter.
  // Present on /v1/hydration + /v1/query; absent on /v1/actor-activity.
  sources?: string[];
  // Resolved by `resolveLeafletPublications`: the base URL and display name of a
  // `site.standard.document`'s publication, used to build the document link and
  // label the card ("From {title} on {publicationName}").
  publicationUrl?: string;
  publicationName?: string;
}

interface ListResponse {
  items: UrlItem[];
  cursor?: string;
  cold?: true;
  // `by-author` / `by-domain` first page only — a publisher/journalist summary.
  about?: AboutCard;
}

interface HydrationResponse {
  shares: ShareRow[];
}

// --- Low-level fetch ---

const appViewGet = async <T>(
  path: string,
  params: URLSearchParams
): Promise<T> => {
  const base = process.env.APPVIEW_API_URL;
  const key = process.env.APPVIEW_API_KEY;
  if (!base || !key) {
    throw new Error("AppView is not configured (APPVIEW_API_URL/API_KEY)");
  }
  const url = `${base.replace(/\/$/, "")}${path}?${params.toString()}`;
  const res = await fetch(url, {
    headers: { "X-API-Key": key },
    signal: AbortSignal.timeout(APPVIEW_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AppView ${path} returned ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
};

/**
 * Register a viewer DID as an AppView seed so their follow graph is indexed
 * from signup, avoiding the cold-start round trip on their first feed request
 * (see API.md `POST /v1/seeds`). Idempotent and best-effort — never throws, so
 * callers can fire-and-forget without blocking auth.
 */
export const seedViewer = async (did: string): Promise<void> => {
  const base = process.env.APPVIEW_API_URL;
  const key = process.env.APPVIEW_API_KEY;
  if (!base || !key || !did) return;
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/v1/seeds`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": key },
      body: JSON.stringify({ dids: [did] }),
      signal: AbortSignal.timeout(APPVIEW_TIMEOUT_MS),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`AppView /v1/seeds returned ${res.status}: ${body}`);
    }
  } catch (e) {
    console.error("AppView /v1/seeds failed:", did, e);
  }
};

/**
 * Link a user's multiple viewer identities — a Bluesky DID and/or Mastodon
 * ActivityPub actor URIs — into one AppView account (`POST /v1/identities/link`),
 * so a read with any of them returns the union of all their data (follows,
 * viewer_shares, prefs). Call when a user connects a second account (e.g. a
 * Mastodon-first user adds Bluesky); otherwise the new identity's reads won't
 * see the old one's history. Idempotent and best-effort — never throws. No-op
 * with fewer than 2 distinct ids (the AppView requires 2–10).
 */
export const linkIdentities = async (ids: string[]): Promise<void> => {
  const base = process.env.APPVIEW_API_URL;
  const key = process.env.APPVIEW_API_KEY;
  if (!base || !key) return;
  const unique = Array.from(new Set(ids.filter(Boolean))).slice(0, 10);
  if (unique.length < 2) return;
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/v1/identities/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": key },
      body: JSON.stringify({ ids: unique }),
      signal: AbortSignal.timeout(APPVIEW_TIMEOUT_MS),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        `AppView /v1/identities/link returned ${res.status}: ${body}`
      );
    }
  } catch (e) {
    console.error("AppView /v1/identities/link failed:", unique, e);
  }
};

/**
 * Store a viewer's mute lists on the AppView (`POST /v1/preferences`), so mutes
 * are applied before ranking. Each field is **per-field last-write-wins**:
 * include `mutedWords` and/or `mutedDids` to replace that list; omit a field to
 * leave the AppView's stored value untouched. An empty array clears the list.
 * Skipped if both fields are omitted (the AppView requires at least one).
 * Best-effort — never throws.
 */
export const postViewerPreferences = async (
  viewer: string,
  prefs: { mutedWords?: string[]; mutedDids?: string[] }
): Promise<void> => {
  const base = process.env.APPVIEW_API_URL;
  const key = process.env.APPVIEW_API_KEY;
  if (!base || !key || !viewer) return;

  const cleanedWords =
    prefs.mutedWords !== undefined
      ? Array.from(
          new Set(prefs.mutedWords.map((w) => w.trim()).filter(Boolean))
        )
      : undefined;
  const cleanedDids =
    prefs.mutedDids !== undefined
      ? Array.from(
          new Set(
            prefs.mutedDids.filter(
              (d) => typeof d === "string" && d.startsWith("did:")
            )
          )
        )
      : undefined;
  if (cleanedWords === undefined && cleanedDids === undefined) return;

  try {
    // JSON.stringify drops undefined values, so omitted fields aren't sent.
    const res = await fetch(`${base.replace(/\/$/, "")}/v1/preferences`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": key },
      body: JSON.stringify({
        viewer,
        mutedWords: cleanedWords,
        mutedDids: cleanedDids,
      }),
      signal: AbortSignal.timeout(APPVIEW_TIMEOUT_MS),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`AppView /v1/preferences returned ${res.status}: ${body}`);
    }
  } catch (e) {
    console.error("AppView /v1/preferences failed:", viewer, e);
  }
};

// --- Share ingestion (`POST /v1/shares`) ---
//
// The path we use to feed Mastodon + Bluesky-list/feed observations into the
// AppView so its trending/latest/search responses include them natively
// (instead of Sill doing a separate DB merge + per-page hydration backfill).

export interface PushShareActor {
  /** ActivityPub Actor URI for Mastodon, DID for Bluesky. */
  id: string;
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface PushSharePost {
  /** http(s) URL for Mastodon, at:// URI for Bluesky. */
  uri: string;
  text: string;
  createdAt: string; // ISO-8601
}

/**
 * Where the viewer saw the share. `follows` is the home timeline (writes to
 * link_posts + synthesizes a follow). Non-`follows` kinds carry the source
 * identifier the AppView canonicalizes into a single string for the read-side
 * `?sourceId=` filter.
 */
export type PushShareSource =
  | { kind: "follows" }
  | { kind: "at-uri"; uri: string } // Bluesky list or custom feed
  | { kind: "mastodon-list"; instance: string; id: string };

export interface PushShare {
  url: string;
  network: "mastodon" | "bsky";
  source: PushShareSource;
  post: PushSharePost;
  actor: PushShareActor;
  /**
   * Present when the timeline entry was a reblog/repost. `actor` (above) is
   * the ORIGINAL post author; `repost.actor` is the reblogger who gets
   * share credit.
   */
  repost?: { actor: PushShareActor; createdAt: string };
  /**
   * Present when the post quotes another. `actor` (above) is the QUOTER;
   * `quoted` carries the quoted author and post.
   */
  quoted?: { actor: PushShareActor; post: PushSharePost };
}

/** One viewer's slice of an AppView shares push. */
export type PushShareBatch = { viewer: string; shares: PushShare[] };

/** Per-viewer cap per API.md §POST /v1/shares. */
const SHARES_PER_VIEWER_CAP = 2000;
/** Per-request batches cap (batched form) per API.md. */
const BATCHES_PER_REQUEST_CAP = 1000;
/** Max single-share drops per request before giving up (self-heal backstop). */
const MAX_DROP_RETRIES = 50;
/**
 * The AppView rejects the whole request if any `post.text` exceeds this (a very
 * long Mastodon status, say). Truncate so one verbose post can't drop an entire
 * batch — the link + identity are what matter, not the full body.
 */
const MAX_POST_TEXT = 8192;
const clampText = (text: string): string =>
  text.length > MAX_POST_TEXT ? text.slice(0, MAX_POST_TEXT) : text;
/** The AppView requires `share.url` to be http(s); drop anything else
 *  (mailto:, at://, custom schemes, malformed) so it can't reject the batch. */
const isHttpUrl = (url: string): boolean => {
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
};
const clampShareText = (s: PushShare): PushShare => {
  const overLong =
    s.post.text.length > MAX_POST_TEXT ||
    (s.quoted ? s.quoted.post.text.length > MAX_POST_TEXT : false);
  if (!overLong) return s;
  return {
    ...s,
    post: { ...s.post, text: clampText(s.post.text) },
    quoted: s.quoted
      ? {
          ...s.quoted,
          post: { ...s.quoted.post, text: clampText(s.quoted.post.text) },
        }
      : s.quoted,
  };
};

/**
 * Push observed shares to the AppView in the **batched form**
 * (`{ batches: [{viewer, shares}, ...] }`), splitting around the spec caps:
 *   - any viewer with >2000 shares is split into multiple per-viewer entries;
 *   - any request with >1000 entries is split into multiple POSTs.
 *
 * The endpoint returns 202 and enqueues; writes are at-least-once and visible
 * in feeds within seconds. Best-effort — logs but does not throw on failure.
 *
 * For Sill's worker pattern (≤100 viewers/pass, modest shares per viewer) this
 * is one HTTP call per batch, replacing the old per-viewer N-call fanout.
 */
export const pushShareBatches = async (
  batches: PushShareBatch[]
): Promise<void> => {
  if (batches.length === 0) return;
  const base = process.env.APPVIEW_API_URL;
  const key = process.env.APPVIEW_API_KEY;
  if (!base || !key) return;
  const target = `${base.replace(/\/$/, "")}/v1/shares`;

  // Per-viewer cap: split any 2000-share viewer into multiple entries. Sanitize
  // first so one bad share can't get the whole request rejected: drop shares
  // whose `url` isn't http(s) (mailto:/at://, etc. — unsalvageable) and clamp
  // over-long post text.
  const split: PushShareBatch[] = [];
  for (const b of batches) {
    if (!b.viewer) continue;
    const cleaned = b.shares
      .filter((s) => isHttpUrl(s.url))
      .map(clampShareText);
    if (cleaned.length === 0) continue;
    for (let i = 0; i < cleaned.length; i += SHARES_PER_VIEWER_CAP) {
      split.push({
        viewer: b.viewer,
        shares: cleaned.slice(i, i + SHARES_PER_VIEWER_CAP),
      });
    }
  }
  if (split.length === 0) return;

  // Per-request cap: up to 1000 batches per POST.
  for (let i = 0; i < split.length; i += BATCHES_PER_REQUEST_CAP) {
    let payload = split.slice(i, i + BATCHES_PER_REQUEST_CAP);
    // Self-heal: the AppView validates the whole request, so one bad share the
    // sanitize step didn't anticipate rejects everything. When it 400s naming a
    // `batches.B.shares.S` field, drop that share and retry, so the rest still
    // land. Capped to avoid a runaway loop.
    for (let attempt = 0; payload.length > 0; attempt++) {
      try {
        const res = await fetch(target, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-API-Key": key },
          body: JSON.stringify({ batches: payload }),
          signal: AbortSignal.timeout(APPVIEW_TIMEOUT_MS),
        });
        if (res.ok) break;
        const body = await res.text().catch(() => "");
        const m =
          res.status === 400 && attempt < MAX_DROP_RETRIES
            ? body.match(/batches\.(\d+)\.shares\.(\d+)/)
            : null;
        if (m) {
          const [bi, si] = [Number(m[1]), Number(m[2])];
          console.warn(
            `AppView /v1/shares: dropping invalid share batches.${bi}.shares.${si} and retrying (${body})`
          );
          payload = payload
            .map((b, idx) =>
              idx === bi
                ? { ...b, shares: b.shares.filter((_, j) => j !== si) }
                : b
            )
            .filter((b) => b.shares.length > 0);
          continue;
        }
        const totalShares = payload.reduce((n, b) => n + b.shares.length, 0);
        console.error(
          `AppView /v1/shares returned ${res.status} for ${payload.length} batches / ${totalShares} shares: ${body}`
        );
        break;
      } catch (e) {
        console.error("AppView /v1/shares failed:", e);
        break;
      }
    }
  }
};

/**
 * One-shot convenience: push a single viewer's shares. Wraps the batched form;
 * use this for one-off callers (API routes, single-list syncs). Workers
 * should collect across users and call `pushShareBatches` once per pass.
 */
export const pushShares = async (
  viewer: string,
  shares: PushShare[]
): Promise<void> => {
  if (!viewer || shares.length === 0) return;
  await pushShareBatches([{ viewer, shares }]);
};

/** Collection NSIDs to request based on Sill's repost filter. */
const collectionsForRepostFilter = (
  hideReposts: "include" | "exclude" | "only"
): string[] | undefined => {
  if (hideReposts === "exclude") return ["app.bsky.feed.post"];
  if (hideReposts === "only") return ["app.bsky.feed.repost"];
  return undefined; // include: all collections
};

/** A time window: a sub-day `hours` window (1–23) or an N-`days` window. */
export interface TimeWindow {
  days?: number;
  hours?: number;
}

/** Set the AppView time-window param. `hours` (sub-day) takes precedence over `days`. */
const appendWindow = (params: URLSearchParams, window: TimeWindow): void => {
  if (window.hours != null) params.set("hours", String(window.hours));
  else params.set("days", String(window.days ?? 1));
};

interface UrlPageOptions {
  viewer: string;
  window: TimeWindow;
  limit: number;
  cursor?: string;
  query?: string;
  sort?: "popularity" | "recency";
  hideReposts: "include" | "exclude" | "only";
  /**
   * Server-side pre-filter on the AppView (`minShares` param) — drop URLs with
   * fewer distinct sharers than this. Default 1 = no filter.
   */
  minShares?: number;
  /**
   * Scope reads to one feed/list. Bluesky feeds/lists: the at-URI verbatim.
   * Mastodon lists: `mastodon-list://<instance>/<id>`. When present, the
   * AppView skips the follow-attributed branch entirely.
   */
  sourceId?: string;
  /**
   * AppView `network=` filter — comma-separated follow-graph keys (e.g.
   * `"bsky"`, `"mastodon"`, `"bsky,mastodon"`). Omit to take the AppView
   * default (`bsky`). Use `networkFromService` to derive this from Sill's
   * `service` filter.
   */
  network?: string;
}

/**
 * Fetch one page of ranked URLs:
 * - a query → /v1/search,
 * - recency sort → /v1/latest (most-recent share first),
 * - otherwise → /v1/trending.
 * All three carry `shares` + `avatars`, so the list renders without hydrating.
 */
export const fetchUrlPage = async (
  opts: UrlPageOptions
): Promise<ListResponse> => {
  const params = new URLSearchParams();
  params.set("viewer", opts.viewer);
  appendWindow(params, opts.window);
  params.set("limit", String(opts.limit));
  if (opts.cursor) params.set("cursor", opts.cursor);
  if (opts.minShares != null && opts.minShares > 1) {
    params.set("minShares", String(opts.minShares));
  }
  if (opts.sourceId) params.set("sourceId", opts.sourceId);
  if (opts.network) params.set("network", opts.network);
  for (const c of collectionsForRepostFilter(opts.hideReposts ?? "include") ??
    []) {
    params.append("collection", c);
  }

  let path = "/v1/trending";
  if (opts.query) {
    path = "/v1/search";
    params.set("q", opts.query);
  } else if (opts.sort === "recency") {
    path = "/v1/latest";
  }
  return appViewGet<ListResponse>(path, params);
};

/**
 * Global trending across the whole index (no viewer / follow-graph scoping).
 * Powers Sill's discovery "Trending links" page. Never returns `cold`.
 */
export const fetchNetworkTrending = async (
  opts: { limit?: number } = {}
): Promise<UrlItem[]> => {
  const params = new URLSearchParams();
  // No days/hours — let network-trending use its server-side default window.
  params.set("limit", String(opts.limit ?? 10));
  const res = await appViewGet<ListResponse>("/v1/network-trending", params);
  return res.items;
};

/**
 * Top URLs from a single publication on a host (`/v1/by-publication`). `domain`
 * is the bare hostname; `publication` picks a brand on it (e.g. "The Athletic")
 * — omit for the host's primary publication. `viewer` scopes to that network;
 * omit for whole-index. (Replaces the old `/v1/by-domain`, which mixed every
 * brand on a host into one feed.)
 */
export const fetchByPublication = async (opts: {
  domain: string;
  publication?: string;
  viewer?: string;
  window?: TimeWindow;
  limit?: number;
  sourceId?: string;
  network?: string;
  cursor?: string;
  hideReposts?: "include" | "exclude" | "only";
  minShares?: number;
  sort?: "popularity" | "recency";
}): Promise<ListResponse> => {
  const params = new URLSearchParams();
  params.set("domain", opts.domain);
  if (opts.publication) params.set("publication", opts.publication);
  if (opts.viewer) params.set("viewer", opts.viewer);
  if (opts.window) appendWindow(params, opts.window);
  params.set("limit", String(opts.limit ?? 20));
  if (opts.sourceId) params.set("sourceId", opts.sourceId);
  if (opts.network) params.set("network", opts.network);
  if (opts.cursor) params.set("cursor", opts.cursor);
  for (const c of collectionsForRepostFilter(opts.hideReposts ?? "include") ??
    []) {
    params.append("collection", c);
  }
  if (opts.minShares != null && opts.minShares > 1) {
    params.set("minShares", String(opts.minShares));
  }
  if (opts.sort) params.set("sort", opts.sort);
  return appViewGet<ListResponse>("/v1/by-publication", params);
};

interface ActorActivityResponse {
  items: ShareRow[];
  cursor?: string;
}

/**
 * Per-actor link-share activity from `/v1/actor-activity`, reverse-chronological
 * (newest `eventTime` first). Same `ShareRow` shape as `/v1/hydration`. Use
 * for "what has @actor recently shared" feeds — no viewer/auth dance, just
 * the actor's DID (or ActivityPub Actor URI).
 *
 * `collection` is a repeated NSID filter; for community bookmarks pass
 * `["community.lexicon.bookmarks.bookmark"]`.
 *
 * `days` caps at 90 (AppView limit); use `hours` for sub-day windows.
 */
export const fetchActorActivity = async (opts: {
  actor: string;
  collection?: string[];
  days?: number;
  hours?: number;
  limit?: number;
  cursor?: string;
}): Promise<ActorActivityResponse> => {
  const params = new URLSearchParams();
  params.set("actor", opts.actor);
  if (opts.collection) {
    for (const c of opts.collection) params.append("collection", c);
  }
  if (opts.hours != null) params.set("hours", String(opts.hours));
  else if (opts.days != null) params.set("days", String(opts.days));
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.cursor) params.set("cursor", opts.cursor);
  return appViewGet<ActorActivityResponse>("/v1/actor-activity", params);
};

/** One URL's scraped metadata from `/v1/url` — `UrlItem`'s metadata subset. */
export interface UrlMetaItem {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
  byline?: string;
  publishedAt?: string;
  /** Popfeed work type for the card URL — see `UrlItem.workType`. */
  workType?: string;
}

interface UrlMetaResponse {
  urls: UrlMetaItem[];
}

/** AppView cap on URLs per `/v1/url` request. */
const URL_META_PER_REQUEST_CAP = 100;

/**
 * Bulk URL-metadata lookup via `/v1/url`. Returns a map keyed by the input
 * URL so callers can resolve in O(1); URLs the AppView hasn't scraped come
 * back as `{ url }` only and still land in the map (other fields absent).
 * Chunks any input >100 URLs into multiple requests per the API.md cap.
 */
export const fetchUrlMetadata = async (
  urls: string[]
): Promise<Map<string, UrlMetaItem>> => {
  const out = new Map<string, UrlMetaItem>();
  if (urls.length === 0 || !appViewEnabled()) return out;
  for (let i = 0; i < urls.length; i += URL_META_PER_REQUEST_CAP) {
    const chunk = urls.slice(i, i + URL_META_PER_REQUEST_CAP);
    const params = new URLSearchParams();
    for (const url of chunk) params.append("urls", url);
    try {
      const res = await appViewGet<UrlMetaResponse>("/v1/url", params);
      for (const item of res.urls) out.set(item.url, item);
    } catch (e) {
      console.error("AppView /v1/url failed:", e);
    }
  }
  return out;
};

/** Top URLs whose article byline matches `author`. `viewer` scopes to that network. */
export const fetchByAuthor = async (opts: {
  author: string;
  viewer?: string;
  window?: TimeWindow;
  limit?: number;
  sourceId?: string;
  network?: string;
  cursor?: string;
  hideReposts?: "include" | "exclude" | "only";
  minShares?: number;
  sort?: "popularity" | "recency";
}): Promise<ListResponse> => {
  const params = new URLSearchParams();
  params.set("author", opts.author);
  if (opts.viewer) params.set("viewer", opts.viewer);
  if (opts.window) appendWindow(params, opts.window);
  params.set("limit", String(opts.limit ?? 20));
  if (opts.sourceId) params.set("sourceId", opts.sourceId);
  if (opts.network) params.set("network", opts.network);
  if (opts.cursor) params.set("cursor", opts.cursor);
  for (const c of collectionsForRepostFilter(opts.hideReposts ?? "include") ??
    []) {
    params.append("collection", c);
  }
  if (opts.minShares != null && opts.minShares > 1) {
    params.set("minShares", String(opts.minShares));
  }
  if (opts.sort) params.set("sort", opts.sort);
  return appViewGet<ListResponse>("/v1/by-author", params);
};

interface HydrationOptions {
  viewer: string;
  window: TimeWindow;
  urls: string[];
  hideReposts: "include" | "exclude" | "only";
  /** Match the read-side scope used by the list call so counts align. */
  sourceId?: string;
  /** Match the read-side `network=` used by the list call so the share set
   *  reflects the same follow graphs (otherwise counts and rows can diverge). */
  network?: string;
}

/** Fetch the individual shares (who shared what) for a set of canonical URLs. */
export const fetchHydration = async (
  opts: HydrationOptions
): Promise<ShareRow[]> => {
  if (opts.urls.length === 0) return [];
  const params = new URLSearchParams();
  params.set("viewer", opts.viewer);
  appendWindow(params, opts.window);
  if (opts.sourceId) params.set("sourceId", opts.sourceId);
  if (opts.network) params.set("network", opts.network);
  for (const c of collectionsForRepostFilter(opts.hideReposts ?? "include") ??
    []) {
    params.append("collection", c);
  }
  for (const url of opts.urls) params.append("urls", url);
  const res = await appViewGet<HydrationResponse>("/v1/hydration", params);
  return res.shares;
};

/**
 * Notification-group query (`POST /v1/query`) — AppView evaluates a list of
 * AND'd predicates against the viewer's last N hours and returns matching URLs
 * with hydrated ShareRows, already filtered + sorted. Predicates are passed
 * through verbatim; the caller must rewrite Sill list-ids to canonical
 * sourceIds (`at://…` / `mastodon-list://…`) before calling — see
 * `sourceIdForList`. The AppView ignores `category.name`/`type`/`values`.
 */
export interface AppViewNotificationQuery {
  category: { id: string };
  operator: string;
  value: string | number;
}

/**
 * One URL group returned by `/v1/query`. Mirrors `UrlItem`'s metadata shape
 * (omits `sharers` — `items` is the full per-share list) plus the hydrated
 * matching `items`. `mostRecent` and `avatars` are populated server-side, so
 * the caller doesn't need to derive them from the (possibly capped) items.
 */
export interface QueryMatch {
  url: string;
  shares: number;
  mostRecent: string;
  avatars: string[];
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
  byline?: string;
  publishedAt?: string;
  /** Popfeed work type for the card URL — see `UrlItem.workType`. */
  workType?: string;
  items: ShareRow[];
}

export interface QueryResponse {
  matches: QueryMatch[];
  cold?: true;
}

export const fetchQuery = async (opts: {
  viewer: string;
  hours?: number;
  limit?: number;
  queries: AppViewNotificationQuery[];
}): Promise<QueryResponse> => {
  const base = process.env.APPVIEW_API_URL;
  const key = process.env.APPVIEW_API_KEY;
  if (!base || !key) {
    throw new Error("AppView is not configured (APPVIEW_API_URL/API_KEY)");
  }
  const body: Record<string, unknown> = {
    viewer: opts.viewer,
    queries: opts.queries,
  };
  if (opts.hours != null) body.hours = opts.hours;
  if (opts.limit != null) body.limit = opts.limit;
  const res = await fetch(`${base.replace(/\/$/, "")}/v1/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(APPVIEW_TIMEOUT_MS),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`AppView /v1/query returned ${res.status}: ${errBody}`);
  }
  return (await res.json()) as QueryResponse;
};

/**
 * Map Sill's `service` filter onto the AppView's `network=` param. Returns
 * `undefined` (use AppView default of `bsky`) only when explicitly requested;
 * `"all"` and absent both yield `bsky,mastodon` so the merged view spans both
 * follow graphs. Keep this in one place — call sites should never hand-roll
 * the mapping.
 */
export const networkFromService = (
  service: "mastodon" | "bluesky" | "all" | undefined
): string | undefined => {
  switch (service) {
    case "mastodon":
      return "mastodon";
    case "bluesky":
      return "bsky";
    case "all":
    case undefined:
      return "bsky,mastodon";
  }
};

// --- Slingshot fallback (resolve repost subjects the AppView couldn't) ---

// Slingshot is an atproto edge record cache; getRecordByUri returns
// { cid, uri, value } where value is the raw record. Public, no auth.
const SLINGSHOT_URL =
  process.env.SLINGSHOT_URL ??
  "https://slingshot.microcosm.blue/xrpc/blue.microcosm.repo.getRecordByUri";
const SLINGSHOT_TIMEOUT_MS = 5000;

const didFromAtUri = (atUri: string): string =>
  atUri.replace("at://", "").split("/")[0];

/** Fetch a single record by at:// URI from Slingshot. Returns null on any failure. */
const fetchRecordFromSlingshot = async (
  atUri: string
): Promise<string | null> => {
  try {
    const url = `${SLINGSHOT_URL}?at_uri=${encodeURIComponent(atUri)}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(SLINGSHOT_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { value?: unknown };
    return json.value ? JSON.stringify(json.value) : null;
  } catch (e) {
    console.error("Slingshot getRecordByUri failed:", atUri, e);
    return null;
  }
};

// --- UrlItem → link mapping ---

/** Lowercase, accent-stripped, hyphenated slug — for Popfeed video-game URLs. */
const slugify = (s: string): string =>
  s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * Popfeed indexes a review under the reviewed work's URN (e.g.
 * `urn:imdb:tt11743610`, `urn:tmdb:38321`). Rewrite that to the public Popfeed
 * work page `https://popfeed.social/{type}/{id}` so the card links somewhere
 * real instead of an unclickable URN. `{type}` is the AppView-supplied
 * `workType` (e.g. `movie`, `tvShow`, `game`) when present, else the URN's
 * provider segment (`imdb`, `tmdb`). The trailing segment is the URN's last `:`
 * part (`id`) — except video games (`workType` `video_game`), which Popfeed keys
 * by a slug of the title rather than the id. Any non-`urn:` URL passes through
 * unchanged.
 */
export const popfeedWorkUrl = (
  url: string,
  workType?: string,
  title?: string
): string => {
  if (!url.startsWith("urn:")) return url;
  const parts = url.split(":");
  const id = parts.pop();
  const provider = parts.pop();
  const type = workType || provider;
  if (!type || type === "urn") return url;
  if (type === "video_game") {
    const slug = slugify(title ?? "");
    return slug ? `https://popfeed.social/${type}/${slug}` : url;
  }
  if (!id) return url;
  return `https://popfeed.social/${type}/${id}`;
};

/**
 * Map an AppView UrlItem to Sill's `link` shape. When an existing DB `link`
 * row is supplied it is preferred (it carries the stable id, topics, metadata,
 * scrape status), with AppView metadata filling any gaps.
 */
export const urlItemToLink = (
  item: UrlItem,
  dbLink?: Link | null
): RenderedLink => {
  // The AppView is the source of truth for URL metadata. The DB row is only a
  // fallback for URLs the AppView hasn't scraped yet (no title).
  const fromAppView = Boolean(item.title);
  // Scraped metadata can carry raw HTML entities (e.g. `Tom &amp; Jerry`,
  // `&#39;`); decode for display — and for the Popfeed game slug.
  const title = decodeHtmlEntities(item.title ?? dbLink?.title ?? "");
  return {
    id: dbLink?.id ?? uuidv7(),
    // Display/click URL. For Popfeed reviews this rewrites the work URN to the
    // Popfeed page (using the AppView `workType` for the path, and the title for
    // game slugs); everything else is unchanged. `sourceUrl` keeps the original
    // so on-demand hydration still queries the AppView by the key it indexed.
    url: popfeedWorkUrl(item.url, item.workType, title),
    sourceUrl: item.url,
    workType: item.workType ?? null,
    title,
    description: decodeHtmlEntitiesMaybe(
      item.description ?? dbLink?.description ?? null
    ),
    // Drop scraped images that point at a local/private host (e.g. an og:image
    // a scraper left unresolved against its own dev origin); they never load and
    // make the browser probe the user's own network.
    imageUrl: publicImageUrl(item.imageUrl) ?? publicImageUrl(dbLink?.imageUrl),
    giftUrl: item.giftUrl ?? dbLink?.giftUrl ?? null,
    metadata: dbLink?.metadata ?? (fromAppView ? { source: "appview" } : null),
    scraped: fromAppView || (dbLink?.scraped ?? false),
    publishedDate: toDbDate(item.publishedAt) ?? dbLink?.publishedDate ?? null,
    // Prefer the AppView's split `authors` (each links individually); fall back
    // to the single `byline` string, then the DB row. Decode entities in names.
    authors:
      (
        item.authors ?? (item.byline ? [item.byline] : dbLink?.authors ?? null)
      )?.map(decodeHtmlEntities) ?? null,
    // Prefer the article's own `siteName`; fall back to `publisherName` (the
    // domain's primary publisher) only when the article scrape didn't yield one.
    siteName: decodeHtmlEntitiesMaybe(
      item.siteName ?? item.publisherName ?? dbLink?.siteName ?? null
    ),
    topics: dbLink?.topics ?? null,
    // Render-time: the publisher's brand icon for this URL (not a DB column).
    publisherIcon: publicImageUrl(item.publisherIcon),
  };
};

/**
 * Fill in missing repost subjects. When the AppView can't resolve a repost's
 * original post (`subject` absent — typically an out-of-network author), try to
 * recover it: first from elsewhere in the same hydrated set (the post or its
 * subject may appear under another share), then from Slingshot by at:// URI.
 * Mutates and returns `shares`.
 */
export const resolveRepostSubjects = async (
  shares: ShareRow[]
): Promise<ShareRow[]> => {
  // Index every non-empty post/subject already present in the set, by at:// URI.
  const known = new Map<string, SubjectPost>();
  for (const s of shares) {
    if (s.collection === "app.bsky.feed.post" && !isEmptyRecord(s.record)) {
      known.set(s.atUri, {
        atUri: s.atUri,
        record: s.record,
        actorDid: s.actorDid,
        actorHandle: s.actorHandle,
        actorName: s.actorName,
        actorAvatar: s.actorAvatar,
      });
    }
    if (s.subject && !isEmptyRecord(s.subject.record)) {
      known.set(s.subject.atUri, s.subject);
    }
  }

  // Reposts whose subject is absent or empty → resolve from the set, else fetch.
  const toFetch = new Map<string, ShareRow[]>();
  for (const s of shares) {
    if (s.collection !== "app.bsky.feed.repost") continue;
    if (s.subject && !isEmptyRecord(s.subject.record)) continue; // already resolved

    // Prefer the subject's own URI (kept even when its record is empty); else
    // read the target from the repost pointer record.
    let targetUri = s.subject?.atUri;
    if (!targetUri) {
      try {
        targetUri = (JSON.parse(s.record) as { subject?: { uri?: string } })
          ?.subject?.uri;
      } catch {
        targetUri = undefined;
      }
    }
    if (!targetUri) continue;

    const found = known.get(targetUri);
    if (found) {
      s.subject = found;
    } else {
      const queued = toFetch.get(targetUri);
      if (queued) queued.push(s);
      else toFetch.set(targetUri, [s]);
    }
  }

  await Promise.all(
    Array.from(toFetch.entries()).map(async ([uri, rows]) => {
      const record = await fetchRecordFromSlingshot(uri);
      if (!record) return;
      // Slingshot returns only the record; keep any author identity already on
      // the (empty) subject and fall back to the URI's DID.
      for (const r of rows) {
        r.subject = {
          atUri: uri,
          record,
          actorDid: r.subject?.actorDid ?? didFromAtUri(uri),
          actorHandle: r.subject?.actorHandle,
          actorName: r.subject?.actorName,
          actorAvatar: r.subject?.actorAvatar,
        };
      }
    })
  );

  return shares;
};

/**
 * Resolve the publication base URL for `site.standard.document` shares so the
 * card can link to the original document (base URL + the document's `path`).
 * The record's `site` is either an https URL (used directly) or an at:// URI to
 * a `site.standard.publication` record, whose `url` we fetch from Slingshot.
 * One fetch per distinct publication. Mutates and returns `shares`.
 */
export const resolveLeafletPublications = async (
  shares: ShareRow[]
): Promise<ShareRow[]> => {
  const toFetch = new Map<string, ShareRow[]>(); // publication at-uri → shares
  for (const s of shares) {
    if (s.collection !== "site.standard.document") continue;
    let site: string | undefined;
    try {
      site = (JSON.parse(s.record) as { site?: string })?.site;
    } catch {
      site = undefined;
    }
    if (!site) continue;
    if (/^https?:\/\//i.test(site)) {
      s.publicationUrl = site; // path appends to the site directly
    } else if (site.startsWith("at://")) {
      const queued = toFetch.get(site);
      if (queued) queued.push(s);
      else toFetch.set(site, [s]);
    }
  }

  await Promise.all(
    Array.from(toFetch.entries()).map(async ([uri, rows]) => {
      const record = await fetchRecordFromSlingshot(uri);
      if (!record) return;
      let pub: { url?: string; name?: string } = {};
      try {
        pub = JSON.parse(record) as { url?: string; name?: string };
      } catch {
        pub = {};
      }
      for (const r of rows) {
        if (pub.url) r.publicationUrl = pub.url;
        if (pub.name) r.publicationName = pub.name;
      }
    })
  );

  return shares;
};

/** Distinct sharing accounts among a set of shares (matches Sill's "shared by" count). */
export const distinctActorCount = (shares: ShareRow[]): number => {
  const ids = new Set<string>();
  for (const s of shares) ids.add(s.actorDid);
  return ids.size;
};
