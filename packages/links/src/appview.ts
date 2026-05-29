import type { AppBskyFeedPost } from "@atproto/api";
import { uuidv7 } from "uuidv7-js";
import { type Link, type LinkPost, postType } from "@sill/schema";
import { serializeBlueskyPostToHtml } from "./bluesky.js";

/**
 * Client for the Sill AppView API — a read-only HTTP index over atproto that
 * answers "what URLs are the people I follow sharing?". See API.md for the
 * full contract. This module wraps the REST endpoints we use for the Bluesky
 * timeline and maps their shapes onto Sill's `link` / `linkPostDenormalized`
 * shapes so the existing frontend renders without changes.
 */

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
  byline?: string;
  publishedAt?: string;
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
  batches: PushShareBatch[],
): Promise<void> => {
  if (batches.length === 0) return;
  const base = process.env.APPVIEW_API_URL;
  const key = process.env.APPVIEW_API_KEY;
  if (!base || !key) return;
  const target = `${base.replace(/\/$/, "")}/v1/shares`;

  // Per-viewer cap: split any 2000-share viewer into multiple entries.
  const split: PushShareBatch[] = [];
  for (const b of batches) {
    if (!b.viewer || b.shares.length === 0) continue;
    for (let i = 0; i < b.shares.length; i += SHARES_PER_VIEWER_CAP) {
      split.push({
        viewer: b.viewer,
        shares: b.shares.slice(i, i + SHARES_PER_VIEWER_CAP),
      });
    }
  }
  if (split.length === 0) return;

  // Per-request cap: up to 1000 batches per POST.
  for (let i = 0; i < split.length; i += BATCHES_PER_REQUEST_CAP) {
    const chunk = split.slice(i, i + BATCHES_PER_REQUEST_CAP);
    try {
      const res = await fetch(target, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": key },
        body: JSON.stringify({ batches: chunk }),
        signal: AbortSignal.timeout(APPVIEW_TIMEOUT_MS),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        const totalShares = chunk.reduce((n, b) => n + b.shares.length, 0);
        console.error(
          `AppView /v1/shares returned ${res.status} for ${chunk.length} batches / ${totalShares} shares: ${body}`,
        );
      }
    } catch (e) {
      console.error("AppView /v1/shares failed:", e);
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
  shares: PushShare[],
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
  for (const c of collectionsForRepostFilter(opts.hideReposts) ?? []) {
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

/** Top URLs from a hostname. `viewer` scopes to that network; omit for whole-index. */
export const fetchByDomain = async (opts: {
  domain: string;
  viewer?: string;
  window?: TimeWindow;
  limit?: number;
  sourceId?: string;
}): Promise<UrlItem[]> => {
  const params = new URLSearchParams();
  params.set("domain", opts.domain);
  if (opts.viewer) params.set("viewer", opts.viewer);
  if (opts.window) appendWindow(params, opts.window);
  params.set("limit", String(opts.limit ?? 20));
  if (opts.sourceId) params.set("sourceId", opts.sourceId);
  const res = await appViewGet<ListResponse>("/v1/by-domain", params);
  return res.items;
};

/** Top URLs whose article byline matches `author`. `viewer` scopes to that network. */
export const fetchByAuthor = async (opts: {
  author: string;
  viewer?: string;
  window?: TimeWindow;
  limit?: number;
  sourceId?: string;
}): Promise<UrlItem[]> => {
  const params = new URLSearchParams();
  params.set("author", opts.author);
  if (opts.viewer) params.set("viewer", opts.viewer);
  if (opts.window) appendWindow(params, opts.window);
  params.set("limit", String(opts.limit ?? 20));
  if (opts.sourceId) params.set("sourceId", opts.sourceId);
  const res = await appViewGet<ListResponse>("/v1/by-author", params);
  return res.items;
};

interface HydrationOptions {
  viewer: string;
  window: TimeWindow;
  urls: string[];
  hideReposts: "include" | "exclude" | "only";
  /** Match the read-side scope used by the list call so counts align. */
  sourceId?: string;
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
  for (const c of collectionsForRepostFilter(opts.hideReposts) ?? []) {
    params.append("collection", c);
  }
  for (const url of opts.urls) params.append("urls", url);
  const res = await appViewGet<HydrationResponse>("/v1/hydration", params);
  return res.shares;
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

// --- Mapping helpers ---

/**
 * Parse an AppView/atproto timestamp to an ISO string. Handles both
 * ClickHouse format ("2026-05-20 13:00:00.000", space separator, no Z) and
 * standard ISO record timestamps.
 */
export const toIso = (ts?: string | null): string | null => {
  if (!ts) return null;
  const normalized = ts.includes("T") ? ts : `${ts.replace(" ", "T")}Z`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/**
 * Format a timestamp the way Drizzle's `timestamp({ mode: "string" })` columns
 * return it: UTC, space-separated, no `T`/`Z` ("2026-05-20 13:01:22.500"). The
 * frontend (PostAuthor) appends its own `Z`, so post/quoted/published dates must
 * be in this shape — a full ISO string would produce an invalid date there.
 * Accepts both ClickHouse (AppView) and ISO (record) inputs.
 */
export const toDbDate = (ts?: string | null): string | null => {
  const iso = toIso(ts);
  return iso ? iso.replace("T", " ").replace("Z", "") : null;
};

const profileUrl = (handleOrDid: string): string =>
  `https://bsky.app/profile/${handleOrDid}`;

/** Build a bsky.app post permalink from an at:// URI. */
const postUrlFromAtUri = (atUri: string, handle?: string | null): string => {
  const parts = atUri.replace("at://", "").split("/");
  const did = parts[0];
  const rkey = parts[parts.length - 1];
  return `https://bsky.app/profile/${handle || did}/post/${rkey}`;
};

/**
 * Extract attached images from a raw (record-level) atproto post embed,
 * constructing CDN thumbnail URLs from blob refs. Best-effort: returns [] for
 * shapes we don't recognize.
 */
const extractImagesFromRecord = (
  // biome-ignore lint/suspicious/noExplicitAny: raw atproto record JSON
  record: any,
  did: string
): { url: string; alt: string }[] => {
  const embed = record?.embed;
  if (!embed) return [];
  // app.bsky.embed.recordWithMedia nests the media under .media
  const media =
    embed.$type === "app.bsky.embed.recordWithMedia" ? embed.media : embed;
  if (
    media?.$type !== "app.bsky.embed.images" ||
    !Array.isArray(media.images)
  ) {
    return [];
  }
  return (
    media.images
      // biome-ignore lint/suspicious/noExplicitAny: raw atproto image JSON
      .map((img: any) => {
        const cid = img?.image?.ref?.$link ?? img?.image?.ref;
        if (typeof cid !== "string") return null;
        return {
          url: `https://cdn.bsky.app/img/feed_thumbnail/plain/${did}/${cid}@jpeg`,
          alt: typeof img?.alt === "string" ? img.alt : "",
        };
      })
      .filter((i: { url: string; alt: string } | null) => i !== null)
  );
};

const parseRecord = (raw: string): AppBskyFeedPost.Record | null => {
  try {
    return JSON.parse(raw) as AppBskyFeedPost.Record;
  } catch {
    return null;
  }
};

/**
 * The AppView returns unresolved records as an empty object (`"{}"`) rather than
 * omitting them, so a present-but-empty record/subject must be treated as
 * "missing" — otherwise it bypasses the repost fallback and renders blank.
 */
const isEmptyRecord = (raw?: string | null): boolean => {
  if (!raw) return true;
  try {
    const obj = JSON.parse(raw);
    return (
      !obj || typeof obj !== "object" || Object.keys(obj as object).length === 0
    );
  } catch {
    return true;
  }
};

const serializeRecord = (record: AppBskyFeedPost.Record | null): string => {
  // Empty-text posts (image/link-only) may omit `text` entirely; the shared
  // serializer assumes a string, so guard before calling it.
  if (!record || typeof record.text !== "string") return "";
  return serializeBlueskyPostToHtml(record);
};

/**
 * Map an AppView UrlItem to Sill's `link` shape. When an existing DB `link`
 * row is supplied it is preferred (it carries the stable id, topics, metadata,
 * scrape status), with AppView metadata filling any gaps.
 */
export const urlItemToLink = (item: UrlItem, dbLink?: Link | null): Link => {
  // The AppView is the source of truth for URL metadata. The DB row is only a
  // fallback for URLs the AppView hasn't scraped yet (no title). When the
  // AppView has metadata we mark it scraped and set a non-null `metadata` so
  // the client-side scraper (useClientMetadata) doesn't re-fetch and override.
  const fromAppView = Boolean(item.title);
  return {
    id: dbLink?.id ?? uuidv7(),
    url: item.url,
    title: item.title ?? dbLink?.title ?? "",
    description: item.description ?? dbLink?.description ?? null,
    imageUrl: item.imageUrl ?? dbLink?.imageUrl ?? null,
    giftUrl: item.giftUrl ?? dbLink?.giftUrl ?? null,
    metadata: dbLink?.metadata ?? (fromAppView ? { source: "appview" } : null),
    scraped: fromAppView || (dbLink?.scraped ?? false),
    publishedDate: toDbDate(item.publishedAt) ?? dbLink?.publishedDate ?? null,
    authors: item.byline ? [item.byline] : dbLink?.authors ?? null,
    siteName: item.siteName ?? dbLink?.siteName ?? null,
    topics: dbLink?.topics ?? null,
  };
};

const emptyDenormalized = (share: ShareRow, userId: string): LinkPost => ({
  id: uuidv7(),
  linkUrl: share.url,
  postUrl: "",
  postText: "",
  postDate:
    toDbDate(share.eventTime) ?? toDbDate(new Date().toISOString()) ?? "",
  postType: postType.enumValues[0], // "bluesky"
  postImages: [],
  actorUrl: profileUrl(share.actorHandle || share.actorDid),
  actorHandle: share.actorHandle || share.actorDid,
  actorName: share.actorName ?? null,
  actorAvatarUrl: share.actorAvatar ?? null,
  quotedActorUrl: null,
  quotedActorHandle: null,
  quotedActorName: null,
  quotedActorAvatarUrl: null,
  quotedPostUrl: null,
  quotedPostText: null,
  quotedPostDate: null,
  quotedPostType: null,
  quotedPostImages: null,
  repostActorUrl: null,
  repostActorHandle: null,
  repostActorName: null,
  repostActorAvatarUrl: null,
  userId,
  listId: null,
});

/**
 * `network.cosmik.card` is a bookmark on Semble. Render it as a bookmark card
 * ("{actor} bookmarked this URL on Semble") linking to the Semble page for the
 * bookmarked URL taken from the record (the raw, non-canonical URL).
 */
const cosmikCardToLinkPost = (share: ShareRow, base: LinkPost): LinkPost => {
  let recordUrl = share.url; // fall back to the canonical URL
  let createdAt: string | undefined;
  try {
    const record = JSON.parse(share.record) as {
      url?: string;
      createdAt?: string;
    };
    if (typeof record.url === "string") recordUrl = record.url;
    if (typeof record.createdAt === "string") createdAt = record.createdAt;
  } catch {
    // keep the canonical URL / share eventTime
  }
  const sembleUrl = `https://semble.so/url?id=${encodeURIComponent(recordUrl)}`;
  const profileUrl = `https://semble.so/profile/${
    share.actorHandle || share.actorDid
  }`;
  return {
    ...base,
    postType: postType.enumValues[2], // "atbookmark"
    // Per-bookmarker URL so two people bookmarking the same link don't collapse
    // into one card under `groupBy(postUrl)` (the cosmik record is often `{}`,
    // so every bookmark would otherwise share the same Semble URL). The link to
    // the Semble page for the URL itself lives in `postText`.
    postUrl: profileUrl,
    // Date by when the bookmark was made (falls back to the share eventTime).
    postDate: toDbDate(createdAt) ?? base.postDate,
    postText: `Bookmarked this on <a href="${sembleUrl}">Semble</a>.`,
    actorUrl: profileUrl,
  };
};

/**
 * `community.lexicon.bookmarks.bookmark` is a platform-agnostic bookmark of a
 * URL. We don't name or link a platform — the bookmarked URL is the share's URL
 * (shown by the link card) and the bookmarker is the share's actor.
 */
const communityBookmarkToLinkPost = (
  share: ShareRow,
  base: LinkPost
): LinkPost => {
  const profile = profileUrl(share.actorHandle || share.actorDid);
  let createdAt: string | undefined;
  try {
    const record = JSON.parse(share.record) as { createdAt?: string };
    if (typeof record.createdAt === "string") createdAt = record.createdAt;
  } catch {
    // fall back to the share eventTime in base
  }
  return {
    ...base,
    postType: postType.enumValues[2], // "atbookmark"
    // Per-bookmarker URL so two people bookmarking the same link don't collapse
    // into one card under `groupBy(postUrl)` (there's no per-bookmark permalink).
    postUrl: profile,
    // Date by when the bookmark was made (falls back to the share eventTime).
    postDate: toDbDate(createdAt) ?? base.postDate,
    // Sill itself writes these bookmarks; the `sill-bookmark` class flags the
    // card for the Sill logo in PostRep.
    postText: '<span class="sill-bookmark">Bookmarked this URL.</span>',
    actorUrl: profile,
  };
};

// --- site.standard.document (leaflet content) ---

// A `site.standard.document` is a long-form post (a blog entry). The AppView
// indexes it as a "share" of any URL linked inside its body. We render the one
// paragraph that links to the shared URL and point the card at the original
// document (the publication's base URL + the document's path). Content can be
// in several lexicons; `pub.leaflet.content` is the only one handled so far.

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const escapeAttr = (s: string): string => escapeHtml(s).replace(/"/g, "&quot;");

/** Only allow http(s) hrefs through (no `javascript:` etc.). */
const safeHref = (uri: string): string | null =>
  /^https?:\/\//i.test(uri) ? uri : null;

interface LeafletFacet {
  index?: { byteStart: number; byteEnd: number };
  features?: { $type?: string; uri?: string }[];
}

const LEAFLET_FACET = "pub.leaflet.richtext.facet";

/** Wrap a (already HTML-escaped) text run in the markup for its facet features. */
const wrapLeafletFeatures = (
  text: string,
  features: { $type?: string; uri?: string }[]
): string => {
  let html = text;
  let href: string | null = null;
  for (const f of features) {
    switch (f.$type) {
      case `${LEAFLET_FACET}#link`:
        if (typeof f.uri === "string") href = safeHref(f.uri);
        break;
      case `${LEAFLET_FACET}#bold`:
        html = `<strong>${html}</strong>`;
        break;
      case `${LEAFLET_FACET}#italic`:
        html = `<em>${html}</em>`;
        break;
      case `${LEAFLET_FACET}#code`:
        html = `<code>${html}</code>`;
        break;
      case `${LEAFLET_FACET}#strikethrough`:
        html = `<s>${html}</s>`;
        break;
      case `${LEAFLET_FACET}#underline`:
        html = `<u>${html}</u>`;
        break;
      // highlight/footnote/mentions: rendered as plain text for now.
    }
  }
  if (href) html = `<a href="${escapeAttr(href)}">${html}</a>`;
  return html;
};

/**
 * Render a leaflet rich-text block (plaintext + `pub.leaflet.richtext.facet[]`)
 * to HTML. Facet indices are byte offsets into the UTF-8 text, so we slice a
 * byte view and decode each run (a JS string slice would mis-index on any
 * multi-byte character).
 */
const renderLeafletRichText = (
  plaintext: string,
  facets?: LeafletFacet[]
): string => {
  const bytes = new TextEncoder().encode(plaintext);
  const decoder = new TextDecoder();
  const slice = (start: number, end: number): string =>
    escapeHtml(decoder.decode(bytes.slice(start, end))).replace(
      /\n/g,
      "<br />"
    );

  const valid = (facets ?? [])
    .filter(
      (f): f is Required<Pick<LeafletFacet, "index">> & LeafletFacet =>
        !!f.index &&
        Array.isArray(f.features) &&
        f.index.byteEnd > f.index.byteStart
    )
    .sort((a, b) => a.index.byteStart - b.index.byteStart);

  const out: string[] = [];
  let cursor = 0;
  for (const f of valid) {
    const { byteStart, byteEnd } = f.index;
    if (byteStart < cursor) continue; // skip overlapping facets
    if (byteStart > cursor) out.push(slice(cursor, byteStart));
    out.push(wrapLeafletFeatures(slice(byteStart, byteEnd), f.features ?? []));
    cursor = byteEnd;
  }
  if (cursor < bytes.length) out.push(slice(cursor, bytes.length));
  return out.join("");
};

const stripTrailingSlash = (u: string): string => u.replace(/\/+$/, "");

/** Trailing-slash- and query-insensitive URL match, for locating a link facet. */
const urlsMatchForFacet = (a: string, b: string): boolean => {
  const na = stripTrailingSlash(a).toLowerCase();
  const nb = stripTrailingSlash(b).toLowerCase();
  if (na === nb) return true;
  const bare = (u: string): string => {
    try {
      const x = new URL(u);
      x.hash = "";
      x.search = "";
      return stripTrailingSlash(x.toString()).toLowerCase();
    } catch {
      return stripTrailingSlash(u).toLowerCase();
    }
  };
  return bare(a) === bare(b);
};

// biome-ignore lint/suspicious/noExplicitAny: raw leaflet record JSON
type LeafletRecord = any;

/**
 * Find the first leaflet block (text/header/blockquote — anything with
 * `plaintext` + `facets`) whose facets link to `targetUrl`, and return it
 * rendered to HTML. Handles both `linearDocument` and `canvas` pages (both
 * carry blocks as `{ block: <inner> }`). Returns null when the content isn't
 * `pub.leaflet.content` or no block links to the URL.
 */
const findLeafletLinkParagraph = (
  record: LeafletRecord,
  targetUrl: string
): string | null => {
  const content = record?.content;
  if (!content || content.$type !== "pub.leaflet.content") return null;
  const pages = Array.isArray(content.pages) ? content.pages : [];
  for (const page of pages) {
    const blocks = Array.isArray(page?.blocks) ? page.blocks : [];
    for (const wrapper of blocks) {
      const inner = wrapper?.block;
      if (
        !inner ||
        typeof inner.plaintext !== "string" ||
        !Array.isArray(inner.facets)
      ) {
        continue;
      }
      const links = inner.facets.some((f: LeafletFacet) =>
        f?.features?.some(
          (ft) =>
            ft?.$type === `${LEAFLET_FACET}#link` &&
            typeof ft.uri === "string" &&
            urlsMatchForFacet(ft.uri, targetUrl)
        )
      );
      if (links) return renderLeafletRichText(inner.plaintext, inner.facets);
    }
  }
  return null;
};

/**
 * Build the public document URL: the publication's base URL (resolved by
 * `resolveLeafletPublications`, or an https `site` used directly) joined with
 * the document's `path`. Returns null when no base URL is known.
 */
const buildLeafletDocUrl = (
  record: LeafletRecord,
  publicationUrl?: string
): string | null => {
  let base = publicationUrl;
  if (!base) {
    const site = typeof record?.site === "string" ? record.site : "";
    if (/^https?:\/\//i.test(site)) base = site;
  }
  if (!base) return null;
  const b = stripTrailingSlash(base);
  const path = typeof record?.path === "string" ? record.path : "";
  if (!path) return b;
  return `${b}${path.startsWith("/") ? path : `/${path}`}`;
};

/**
 * Map a `site.standard.document` share to Sill's `linkPostDenormalized` shape:
 * the card body is the paragraph that links to the shared URL (rendered rich
 * text) plus a line linking to the full document on its publication (leaflet).
 */
const leafletDocumentToLinkPost = (
  share: ShareRow,
  base: LinkPost
): LinkPost => {
  let record: LeafletRecord = null;
  try {
    record = JSON.parse(share.record);
  } catch {
    // leave record null → bare fallback below
  }
  const docUrl = buildLeafletDocUrl(record, share.publicationUrl);
  const title =
    typeof record?.title === "string" && record.title ? record.title : "a post";
  const docLink = docUrl
    ? `<a href="${escapeAttr(docUrl)}">${escapeHtml(title)}</a>`
    : escapeHtml(title);

  const publication = escapeHtml(share.publicationName || "Leaflet");

  const paragraph = record
    ? findLeafletLinkParagraph(record, share.url)
    : null;
  // When the paragraph is found, quote it as a blockquote with a "from {doc}"
  // line; otherwise a generic line still linking to the document. The
  // `leaflet-source` class also flags the card for the Leaflet logo in PostRep.
  const postText = paragraph
    ? `<blockquote>${paragraph}</blockquote><p class="leaflet-source">From ${docLink} on ${publication}</p>`
    : `<p class="leaflet-source">Linked to this in ${docLink} on ${publication}.</p>`;

  return {
    ...base,
    postType: postType.enumValues[2], // "atbookmark" (non-bsky/mastodon collection)
    // The card timestamp links to the document. Falls back to the author's
    // profile only when the document URL can't be resolved.
    postUrl: docUrl ?? base.actorUrl,
    // Date the card by when the document was published, not when the AppView
    // indexed the share (falls back to the share eventTime from `base`).
    postDate: toDbDate(record?.publishedAt) ?? base.postDate,
    postText,
    actorUrl: profileUrl(share.actorHandle || share.actorDid),
  };
};

type QuotedFields = Pick<
  LinkPost,
  | "quotedActorUrl"
  | "quotedActorHandle"
  | "quotedActorName"
  | "quotedActorAvatarUrl"
  | "quotedPostUrl"
  | "quotedPostText"
  | "quotedPostDate"
  | "quotedPostType"
  | "quotedPostImages"
>;

/** Build Sill's `quoted*` fields from a resolved quoted post (a SubjectPost). */
const quotedFields = (subject: SubjectPost): QuotedFields => {
  const quoted = parseRecord(subject.record);
  return {
    quotedActorUrl: profileUrl(subject.actorHandle || subject.actorDid),
    quotedActorHandle: subject.actorHandle || subject.actorDid,
    quotedActorName: subject.actorName ?? null,
    quotedActorAvatarUrl: subject.actorAvatar ?? null,
    quotedPostUrl: postUrlFromAtUri(subject.atUri, subject.actorHandle),
    quotedPostText: serializeRecord(quoted),
    quotedPostDate: toDbDate(quoted?.createdAt),
    quotedPostType: postType.enumValues[0], // "bluesky"
    quotedPostImages: extractImagesFromRecord(quoted, subject.actorDid),
  };
};

/**
 * Map an AppView hydration ShareRow to Sill's `linkPostDenormalized` shape.
 *
 * - `app.bsky.feed.post`: a normal post or a quote. `actor*` is the sharer; a
 *   `subject` (if present) is the quoted post → `quoted*` fields.
 * - `app.bsky.feed.repost`: `actor*` becomes the original author (from
 *   `subject`) and the reposter moves to `repostActor*`, matching Sill's model
 *   where the card body is the original post with a "reposted by" banner. If
 *   the reposted post is itself a quote, its quoted post (`subject.subject`)
 *   fills the `quoted*` fields.
 * - `network.cosmik.card`: a Semble bookmark (see `cosmikCardToLinkPost`).
 * - `community.lexicon.bookmarks.bookmark`: a platform-agnostic bookmark (see
 *   `communityBookmarkToLinkPost`).
 * - `site.standard.document`: a long-form post linking to the URL in its body
 *   (see `leafletDocumentToLinkPost`).
 *
 * Quoted-post cards and repost original-authors are only available when the
 * AppView resolved `subject` (in-network author); otherwise we fall back to a
 * bare share attributed to the sharer.
 */
export const shareRowToLinkPost = (
  share: ShareRow,
  userId: string
): LinkPost => {
  const base = emptyDenormalized(share, userId);

  if (share.collection === "network.cosmik.card") {
    return cosmikCardToLinkPost(share, base);
  }

  if (share.collection === "community.lexicon.bookmarks.bookmark") {
    return communityBookmarkToLinkPost(share, base);
  }

  if (share.collection === "site.standard.document") {
    return leafletDocumentToLinkPost(share, base);
  }

  if (share.collection === "app.bsky.feed.repost") {
    // Absent or empty (`{}`) subject → unresolved original; render bare.
    if (!share.subject || isEmptyRecord(share.subject.record)) return base;
    const subjectRecord = parseRecord(share.subject.record);
    // Repost OF a quote post: the quoted post is the subject's own subject.
    const nestedQuote =
      share.subject.subject && !isEmptyRecord(share.subject.subject.record)
        ? quotedFields(share.subject.subject)
        : null;
    return {
      ...base,
      // original author becomes the primary actor; the card body is the
      // original post, so its createdAt is the date we render.
      postUrl: postUrlFromAtUri(share.subject.atUri, share.subject.actorHandle),
      postText: serializeRecord(subjectRecord),
      postDate: toDbDate(subjectRecord?.createdAt) ?? base.postDate,
      postImages: extractImagesFromRecord(
        subjectRecord,
        share.subject.actorDid
      ),
      actorUrl: profileUrl(share.subject.actorHandle || share.subject.actorDid),
      actorHandle: share.subject.actorHandle || share.subject.actorDid,
      actorName: share.subject.actorName ?? null,
      actorAvatarUrl: share.subject.actorAvatar ?? null,
      // the network member who reposted
      repostActorUrl: profileUrl(share.actorHandle || share.actorDid),
      repostActorHandle: share.actorHandle || share.actorDid,
      repostActorName: share.actorName ?? null,
      repostActorAvatarUrl: share.actorAvatar ?? null,
      ...nestedQuote,
    };
  }

  // app.bsky.feed.post (normal post or quote post)
  const record = parseRecord(share.record);
  const post: LinkPost = {
    ...base,
    postUrl: postUrlFromAtUri(share.atUri, share.actorHandle),
    postText: serializeRecord(record),
    postDate: toDbDate(record?.createdAt) ?? base.postDate,
    postImages: extractImagesFromRecord(record, share.actorDid),
  };

  if (share.subject && !isEmptyRecord(share.subject.record)) {
    Object.assign(post, quotedFields(share.subject));
  }

  return post;
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
