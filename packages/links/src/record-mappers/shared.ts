import {
	type AppBskyFeedPost,
	AppBskyRichtextFacet,
	RichText,
} from "@atproto/api";
import {
	type LinkPost,
	type RenderedLinkPost,
	type RenderedParentPost,
	postType,
} from "@sill/schema";
import { uuidv7 } from "uuidv7-js";
import type { ShareRow, SubjectPost } from "../appview.js";

/**
 * Shared toolkit for the per-collection `ShareRow` → `linkPostDenormalized`
 * mappers (see the sibling files in this directory). Pure functions only —
 * no network, no DB. Types are imported from `../appview.js` as `import type`
 * so this module has no runtime dependency back on the HTTP client.
 */

// --- Timestamps ---

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

// --- URL / profile helpers ---

export const profileUrl = (handleOrDid: string): string =>
	`https://bsky.app/profile/${handleOrDid}`;

/** Build a bsky.app post permalink from an at:// URI. */
export const postUrlFromAtUri = (
	atUri: string,
	handle?: string | null,
): string => {
	const parts = atUri.replace("at://", "").split("/");
	const did = parts[0];
	const rkey = parts[parts.length - 1];
	return `https://bsky.app/profile/${handle || did}/post/${rkey}`;
};

/**
 * Mastodon actor identifier (the ActivityPub Actor URI Sill pushed up — e.g.
 * `https://mastodon.social/users/alice`) is itself a fine profile URL. We
 * leave it untransformed; the federated instance redirects `/users/x` to the
 * human `/@x` view on the client.
 */
export const mastodonProfileUrl = (actorId: string): string => actorId;

/**
 * Heuristic: an `at://…` URI is Bluesky, anything else (http(s)://) is
 * Mastodon. Used to type quoted subjects since `SubjectPost` has no
 * `collection` field — the parent share's collection is the only authoritative
 * signal, and only when the quoted post is reachable.
 */
export const networkFromAtUri = (atUri: string): "bluesky" | "mastodon" =>
	atUri.startsWith("at://") ? "bluesky" : "mastodon";

/** Quoted-post permalink that respects the subject's network shape. */
export const quotedPostPermalink = (
	atUri: string,
	handle: string | null | undefined,
): string =>
	networkFromAtUri(atUri) === "bluesky"
		? postUrlFromAtUri(atUri, handle)
		: atUri;

/** Profile URL builder that respects the subject's network shape. */
export const subjectProfileUrl = (
	atUri: string,
	handleOrDid: string,
): string =>
	networkFromAtUri(atUri) === "bluesky"
		? profileUrl(handleOrDid)
		: mastodonProfileUrl(handleOrDid);

// --- HTML helpers ---

export const escapeHtml = (s: string): string =>
	s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const escapeAttr = (s: string): string =>
	escapeHtml(s).replace(/"/g, "&quot;");

/** Only allow http(s) hrefs through (no `javascript:` etc.). */
export const safeHref = (uri: string): string | null =>
	/^https?:\/\//i.test(uri) ? uri : null;

// --- Record parsing / serialization ---

/**
 * Serialize a Bluesky post record (text + richtext facets) to HTML. Pure —
 * only depends on `@atproto/api`'s RichText. The mapper layer is its sole
 * consumer, so it lives here rather than in the social `bluesky.ts` module.
 */
export const serializeBlueskyPostToHtml = (
	post: AppBskyFeedPost.Record,
): string => {
	const rt = new RichText({
		text: post.text,
		facets: post.facets,
	});
	const html: string[] = [];
	for (const segment of rt.segments()) {
		segment.text = segment.text.replace(/\n/g, "<br />");
		if (segment.text && !segment.facet && !segment.link) {
			html.push(segment.text);
		} else if (segment.link && !segment.facet) {
			html.push(`<a href="${segment.link.uri}">${segment.text}</a>`);
		} else if (
			segment.facet?.features.find((f) => AppBskyRichtextFacet.isLink(f))
		) {
			const linkFacet = segment.facet.features.find((f) =>
				AppBskyRichtextFacet.isLink(f),
			);
			if (linkFacet) {
				html.push(`<a href=${linkFacet.uri}>${segment.text}</a>`);
			}
		} else if (
			segment.facet?.features.find((f) => AppBskyRichtextFacet.isMention(f))
		) {
			const mentionFacet = segment.facet.features.find((f) =>
				AppBskyRichtextFacet.isMention(f),
			);
			if (mentionFacet) {
				html.push(
					`<a href="https://bsky.app/profile/${segment.text.split("@")[1]}">${
						segment.text
					}</a>`,
				);
			}
		} else if (segment.isMention()) {
			html.push(
				`<a href="https://bsky.app/profile/${segment.text.split("@")[1]}">${
					segment.text
				}</a>`,
			);
		} else {
			html.push(segment.text);
		}
	}
	return html.join("");
};

export const parseRecord = (raw: string): AppBskyFeedPost.Record | null => {
	try {
		return JSON.parse(raw) as AppBskyFeedPost.Record;
	} catch {
		return null;
	}
};

/** Minimal parse for the synthesized Mastodon record body (`{text, createdAt, uri}`). */
export const parseMastodonRecord = (
	raw: string,
): { text?: string; createdAt?: string; uri?: string } | null => {
	try {
		return JSON.parse(raw) as {
			text?: string;
			createdAt?: string;
			uri?: string;
		};
	} catch {
		return null;
	}
};

/**
 * The AppView returns unresolved records as an empty object (`"{}"`) rather than
 * omitting them, so a present-but-empty record/subject must be treated as
 * "missing" — otherwise it bypasses the repost fallback and renders blank.
 */
export const isEmptyRecord = (raw?: string | null): boolean => {
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

export const serializeRecord = (
	record: AppBskyFeedPost.Record | null,
): string => {
	// Empty-text posts (image/link-only) may omit `text` entirely; the shared
	// serializer assumes a string, so guard before calling it.
	if (!record || typeof record.text !== "string") return "";
	return serializeBlueskyPostToHtml(record);
};

/**
 * Extract attached images from a raw (record-level) atproto post embed,
 * constructing CDN thumbnail URLs from blob refs. Best-effort: returns [] for
 * shapes we don't recognize.
 */
export const extractImagesFromRecord = (
	// biome-ignore lint/suspicious/noExplicitAny: raw atproto record JSON
	record: any,
	did: string,
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

/** The neutral base `LinkPost` every collection mapper starts from. Carries the
 *  share's `sources` so every mapped post inherits it via the `...base` spread. */
export const emptyDenormalized = (
	share: ShareRow,
	userId: string,
): RenderedLinkPost => ({
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
	sources: share.sources ?? null,
	collection: share.collection,
});

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

/**
 * Build Sill's `quoted*` fields from a resolved quoted post (a SubjectPost).
 * The subject carries no `collection` of its own, so we infer the network from
 * the at:// vs http(s) shape of `atUri` — Bluesky quotes get a bsky.app
 * permalink and `quotedPostType: "bluesky"`; Mastodon quotes pass the HTTP
 * URL through and get `quotedPostType: "mastodon"`.
 */
export const quotedFields = (subject: SubjectPost): QuotedFields => {
	const quoted = parseRecord(subject.record);
	const isBsky = networkFromAtUri(subject.atUri) === "bluesky";
	const handleOrDid = subject.actorHandle || subject.actorDid;
	return {
		quotedActorUrl: subjectProfileUrl(subject.atUri, handleOrDid),
		quotedActorHandle: handleOrDid,
		quotedActorName: subject.actorName ?? null,
		quotedActorAvatarUrl: subject.actorAvatar ?? null,
		quotedPostUrl: quotedPostPermalink(subject.atUri, subject.actorHandle),
		quotedPostText: serializeRecord(quoted),
		quotedPostDate: toDbDate(quoted?.createdAt),
		quotedPostType: isBsky ? postType.enumValues[0] : postType.enumValues[1], // "bluesky" | "mastodon"
		quotedPostImages: isBsky
			? extractImagesFromRecord(quoted, subject.actorDid)
			: [],
	};
};

/**
 * Build the `parent` (replied-to) post from a hydrated share's reply `parent`
 * (a SubjectPost). Bluesky only — reply parents are always atproto posts. When
 * the parent is itself a quote post, its referenced post (`parent.subject`)
 * fills the `quoted*` fields so the parent card renders its quote too.
 */
export const parentFields = (parent: SubjectPost): RenderedParentPost => {
	const record = parseRecord(parent.record);
	const handleOrDid = parent.actorHandle || parent.actorDid;
	const fields: RenderedParentPost = {
		actorUrl: profileUrl(handleOrDid),
		actorName: parent.actorName ?? null,
		actorHandle: handleOrDid,
		actorAvatarUrl: parent.actorAvatar ?? null,
		postUrl: postUrlFromAtUri(parent.atUri, parent.actorHandle),
		postDate: toDbDate(record?.createdAt) ?? "",
		postText: serializeRecord(record),
		postType: postType.enumValues[0], // "bluesky"
		postImages: extractImagesFromRecord(record, parent.actorDid),
		quotedActorUrl: null,
		quotedActorHandle: null,
		quotedActorName: null,
		quotedActorAvatarUrl: null,
		quotedPostUrl: null,
		quotedPostText: null,
		quotedPostDate: null,
		quotedPostType: null,
		quotedPostImages: null,
	};
	if (parent.subject && !isEmptyRecord(parent.subject.record)) {
		Object.assign(fields, quotedFields(parent.subject));
	}
	return fields;
};
