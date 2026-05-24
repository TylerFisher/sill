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
  mostRecent?: string; // present on trending/search
  eventTime?: string; // present on /v1/latest instead of shares/mostRecent
  giftUrl?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
  byline?: string;
  publishedAt?: string;
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

export type TimelineSort = "popularity" | "recency";

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
  sort: TimelineSort;
  query?: string;
  hideReposts: "include" | "exclude" | "only";
}

/**
 * Fetch one page of ranked URLs. Routes to /v1/search when a query is present,
 * /v1/latest for recency, otherwise /v1/trending.
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

  let path: string;
  if (opts.query) {
    path = "/v1/search";
    params.set("q", opts.query);
  } else if (opts.sort === "recency") {
    path = "/v1/latest";
  } else {
    path = "/v1/trending";
  }
  return appViewGet<ListResponse>(path, params);
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
    if (!share.subject) return base; // out-of-network original, render bare
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

  if (share.subject) {
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

/** Distinct sharing accounts among a set of shares (matches Sill's "shared by" count). */
export const distinctActorCount = (shares: ShareRow[]): number => {
  const ids = new Set<string>();
  for (const s of shares) ids.add(s.actorDid);
  return ids.size;
};
