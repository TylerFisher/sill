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

export interface UrlItem {
  url: string;
  shares?: number; // present on trending/search; absent on /v1/latest
  avatars?: string[]; // up to 3 sharer avatars for a face pile; absent on /v1/latest
  mostRecent?: string; // present on trending/search
  eventTime?: string; // present on /v1/latest instead of shares/mostRecent
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
  params: URLSearchParams,
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

/** Collection NSIDs to request based on Sill's repost filter. */
const collectionsForRepostFilter = (
  hideReposts: "include" | "exclude" | "only",
): string[] | undefined => {
  if (hideReposts === "exclude") return ["app.bsky.feed.post"];
  if (hideReposts === "only") return ["app.bsky.feed.repost"];
  return undefined; // include: all collections
};

interface UrlPageOptions {
  viewer: string;
  days: number;
  limit: number;
  cursor?: string;
  query?: string;
  hideReposts: "include" | "exclude" | "only";
}

/**
 * Fetch one page of ranked URLs. Routes to /v1/search when a query is present,
 * otherwise /v1/trending. We always use trending (not /v1/latest) because only
 * trending carries the `shares` count and `avatars` face pile the list needs to
 * render without hydrating; recency is applied by re-sorting these items.
 */
export const fetchUrlPage = async (
  opts: UrlPageOptions,
): Promise<ListResponse> => {
  const params = new URLSearchParams();
  params.set("viewer", opts.viewer);
  params.set("days", String(opts.days));
  params.set("limit", String(opts.limit));
  if (opts.cursor) params.set("cursor", opts.cursor);
  for (const c of collectionsForRepostFilter(opts.hideReposts) ?? []) {
    params.append("collection", c);
  }

  let path = "/v1/trending";
  if (opts.query) {
    path = "/v1/search";
    params.set("q", opts.query);
  }
  return appViewGet<ListResponse>(path, params);
};

/**
 * Global trending across the whole index (no viewer / follow-graph scoping).
 * Powers Sill's discovery "Trending links" page. Never returns `cold`.
 */
export const fetchNetworkTrending = async (
  opts: { days?: number; limit?: number } = {},
): Promise<UrlItem[]> => {
  const params = new URLSearchParams();
  params.set("days", String(opts.days ?? 1));
  params.set("limit", String(opts.limit ?? 10));
  const res = await appViewGet<ListResponse>("/v1/network-trending", params);
  return res.items;
};

interface HydrationOptions {
  viewer: string;
  days: number;
  urls: string[];
  hideReposts: "include" | "exclude" | "only";
}

/** Fetch the individual shares (who shared what) for a set of canonical URLs. */
export const fetchHydration = async (
  opts: HydrationOptions,
): Promise<ShareRow[]> => {
  if (opts.urls.length === 0) return [];
  const params = new URLSearchParams();
  params.set("viewer", opts.viewer);
  params.set("days", String(opts.days));
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
  atUri: string,
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
  did: string,
): { url: string; alt: string }[] => {
  const embed = record?.embed;
  if (!embed) return [];
  // app.bsky.embed.recordWithMedia nests the media under .media
  const media =
    embed.$type === "app.bsky.embed.recordWithMedia" ? embed.media : embed;
  if (media?.$type !== "app.bsky.embed.images" || !Array.isArray(media.images)) {
    return [];
  }
  return media.images
    // biome-ignore lint/suspicious/noExplicitAny: raw atproto image JSON
    .map((img: any) => {
      const cid = img?.image?.ref?.$link ?? img?.image?.ref;
      if (typeof cid !== "string") return null;
      return {
        url: `https://cdn.bsky.app/img/feed_thumbnail/plain/${did}/${cid}@jpeg`,
        alt: typeof img?.alt === "string" ? img.alt : "",
      };
    })
    .filter((i: { url: string; alt: string } | null) => i !== null);
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
  return {
    id: dbLink?.id ?? uuidv7(),
    url: item.url,
    title: dbLink?.title ?? item.title ?? "",
    description: dbLink?.description ?? item.description ?? null,
    imageUrl: dbLink?.imageUrl ?? item.imageUrl ?? null,
    giftUrl: dbLink?.giftUrl ?? item.giftUrl ?? null,
    metadata: dbLink?.metadata ?? null,
    scraped: dbLink?.scraped ?? Boolean(item.title),
    publishedDate: dbLink?.publishedDate ?? toDbDate(item.publishedAt),
    authors: dbLink?.authors ?? (item.byline ? [item.byline] : null),
    siteName: dbLink?.siteName ?? item.siteName ?? null,
    topics: dbLink?.topics ?? null,
  };
};

const emptyDenormalized = (
  share: ShareRow,
  userId: string,
): LinkPost => ({
  id: uuidv7(),
  linkUrl: share.url,
  postUrl: "",
  postText: "",
  postDate: toDbDate(share.eventTime) ?? toDbDate(new Date().toISOString()) ?? "",
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
 * Map an AppView hydration ShareRow to Sill's `linkPostDenormalized` shape.
 *
 * - `app.bsky.feed.post`: a normal post or a quote. `actor*` is the sharer; a
 *   `subject` (if present) is the quoted post → `quoted*` fields.
 * - `app.bsky.feed.repost`: `actor*` becomes the original author (from
 *   `subject`) and the reposter moves to `repostActor*`, matching Sill's model
 *   where the card body is the original post with a "reposted by" banner.
 *
 * Quoted-post cards and repost original-authors are only available when the
 * AppView resolved `subject` (in-network author); otherwise we fall back to a
 * bare share attributed to the sharer.
 */
export const shareRowToLinkPost = (
  share: ShareRow,
  userId: string,
): LinkPost => {
  const base = emptyDenormalized(share, userId);

  if (share.collection === "app.bsky.feed.repost") {
    // Absent or empty (`{}`) subject → unresolved original; render bare.
    if (!share.subject || isEmptyRecord(share.subject.record)) return base;
    const subjectRecord = parseRecord(share.subject.record);
    return {
      ...base,
      // original author becomes the primary actor; the card body is the
      // original post, so its createdAt is the date we render.
      postUrl: postUrlFromAtUri(share.subject.atUri, share.subject.actorHandle),
      postText: serializeRecord(subjectRecord),
      postDate: toDbDate(subjectRecord?.createdAt) ?? base.postDate,
      postImages: extractImagesFromRecord(subjectRecord, share.subject.actorDid),
      actorUrl: profileUrl(share.subject.actorHandle || share.subject.actorDid),
      actorHandle: share.subject.actorHandle || share.subject.actorDid,
      actorName: share.subject.actorName ?? null,
      actorAvatarUrl: share.subject.actorAvatar ?? null,
      // the network member who reposted
      repostActorUrl: profileUrl(share.actorHandle || share.actorDid),
      repostActorHandle: share.actorHandle || share.actorDid,
      repostActorName: share.actorName ?? null,
      repostActorAvatarUrl: share.actorAvatar ?? null,
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
    const quoted = parseRecord(share.subject.record);
    post.quotedActorUrl = profileUrl(
      share.subject.actorHandle || share.subject.actorDid,
    );
    post.quotedActorHandle = share.subject.actorHandle || share.subject.actorDid;
    post.quotedActorName = share.subject.actorName ?? null;
    post.quotedActorAvatarUrl = share.subject.actorAvatar ?? null;
    post.quotedPostUrl = postUrlFromAtUri(
      share.subject.atUri,
      share.subject.actorHandle,
    );
    post.quotedPostText = serializeRecord(quoted);
    post.quotedPostDate = toDbDate(quoted?.createdAt);
    post.quotedPostType = postType.enumValues[0]; // "bluesky"
    post.quotedPostImages = extractImagesFromRecord(
      quoted,
      share.subject.actorDid,
    );
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
  shares: ShareRow[],
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
    }),
  );

  return shares;
};

/** Distinct sharing accounts among a set of shares (matches Sill's "shared by" count). */
export const distinctActorCount = (shares: ShareRow[]): number => {
  const ids = new Set<string>();
  for (const s of shares) ids.add(s.actorDid);
  return ids.size;
};
