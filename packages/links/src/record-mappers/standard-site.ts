import { type LinkPost, postType } from "@sill/schema";
import type { ShareRow } from "../appview.js";
import {
	escapeAttr,
	escapeHtml,
	profileUrl,
	safeHref,
	toDbDate,
} from "./shared.js";

// A `site.standard.document` is a long-form post (a blog entry). The AppView
// indexes it as a "share" of any URL linked inside its body. We render the one
// block that links to the shared URL and point the card at the original
// document (the publication's base URL + the document's path).
//
// The `site.standard.document` envelope (title / site / path / publishedAt) is
// shared across publishing apps; only the `content` body is app-specific. Every
// supported app uses the same atproto richtext shape (plaintext + byte-indexed
// facets), so the renderer is shared — only the document structure around the
// text blocks differs:
//   - `pub.leaflet.content` (Leaflet): content.pages[].blocks[].block
//   - `app.offprint.content` (Offprint): content.items[] (blockquote nests)
//   - `blog.pckt.content` (Pckt): content.items[] (same flat shape as Offprint)
//
// Offprint and Pckt share the flat-`items` walk; their block `$type`s differ
// only by NSID prefix, so we match on the block's local name (last `.` segment).
//
// The publication base URL/name is resolved upstream by
// `resolveLeafletPublications` (in appview.ts) and arrives on
// `share.publicationUrl` / `share.publicationName`.

// biome-ignore lint/suspicious/noExplicitAny: raw standard.site record JSON
type StandardSiteRecord = any;

interface ContentSource {
	/** Fallback publication name when the publication record didn't resolve. */
	defaultName: string;
	/**
	 * Marker class added to the card body so PostRep can pick the source logo
	 * (`leaflet-source` → Leaflet, `offprint-source` → Offprint).
	 */
	marker: string;
}

const contentSourceFor = (contentType: unknown): ContentSource => {
	if (contentType === "app.offprint.content") {
		return { defaultName: "Offprint", marker: "offprint-source" };
	}
	if (contentType === "blog.pckt.content") {
		return { defaultName: "Pckt", marker: "pckt-source" };
	}
	// pub.leaflet.content + anything else we don't specifically brand.
	return { defaultName: "Leaflet", marker: "leaflet-source" };
};

const stripTrailingSlash = (u: string): string => u.replace(/\/+$/, "");

/** Trailing-slash- and query-insensitive URL match, for locating a link. */
const urlsMatch = (a: string, b: string): boolean => {
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

// --- Shared richtext renderer (Leaflet + Offprint) ---
//
// Both `pub.leaflet.richtext.facet` and `app.offprint.richtext.facet` are the
// same shape: a `{ byteStart, byteEnd }` index plus a `features[]` union whose
// member `$type`s share a vocabulary after the `#` (`#link`, `#bold`, …). We
// match on that suffix so one renderer serves both.

interface RichTextFacet {
	index?: { byteStart: number; byteEnd: number };
	features?: { $type?: string; uri?: string }[];
}

/** The feature kind after the `#` (e.g. `…facet#link` → `link`). */
const featureKind = (type: string | undefined): string =>
	type?.split("#")[1] ?? "";

/** Feature kinds that carry a `uri` and represent a link to some URL. */
const LINK_KINDS = new Set(["link", "webMention"]);

/** Whether any facet links to `targetUrl`. */
const facetsLinkTo = (facets: RichTextFacet[], targetUrl: string): boolean =>
	facets.some((f) =>
		f?.features?.some(
			(ft) =>
				LINK_KINDS.has(featureKind(ft?.$type)) &&
				typeof ft?.uri === "string" &&
				urlsMatch(ft.uri, targetUrl),
		),
	);

/** Wrap a (already HTML-escaped) text run in markup for its facet features. */
const wrapFeatures = (
	text: string,
	features: { $type?: string; uri?: string }[],
): string => {
	let html = text;
	let href: string | null = null;
	for (const f of features) {
		switch (featureKind(f.$type)) {
			case "link":
			case "webMention":
				if (typeof f.uri === "string") href = safeHref(f.uri);
				break;
			case "bold":
				html = `<strong>${html}</strong>`;
				break;
			case "italic":
				html = `<em>${html}</em>`;
				break;
			case "code":
				html = `<code>${html}</code>`;
				break;
			case "strikethrough":
				html = `<s>${html}</s>`;
				break;
			case "underline":
				html = `<u>${html}</u>`;
				break;
			// highlight/mention/footnote: rendered as plain text for now.
		}
	}
	if (href) html = `<a href="${escapeAttr(href)}">${html}</a>`;
	return html;
};

/**
 * Render a richtext block (plaintext + facets) to HTML. Facet indices are byte
 * offsets into the UTF-8 text, so we slice a byte view and decode each run (a
 * JS string slice would mis-index on any multi-byte character).
 */
const renderRichText = (
	plaintext: string,
	facets?: RichTextFacet[],
): string => {
	const bytes = new TextEncoder().encode(plaintext);
	const decoder = new TextDecoder();
	const slice = (start: number, end: number): string =>
		escapeHtml(decoder.decode(bytes.slice(start, end))).replace(
			/\n/g,
			"<br />",
		);

	const valid = (facets ?? [])
		.filter(
			(f): f is Required<Pick<RichTextFacet, "index">> & RichTextFacet =>
				!!f.index &&
				Array.isArray(f.features) &&
				f.index.byteEnd > f.index.byteStart,
		)
		.sort((a, b) => a.index.byteStart - b.index.byteStart);

	const out: string[] = [];
	let cursor = 0;
	for (const f of valid) {
		const { byteStart, byteEnd } = f.index;
		if (byteStart < cursor) continue; // skip overlapping facets
		if (byteStart > cursor) out.push(slice(cursor, byteStart));
		out.push(wrapFeatures(slice(byteStart, byteEnd), f.features ?? []));
		cursor = byteEnd;
	}
	if (cursor < bytes.length) out.push(slice(cursor, bytes.length));
	return out.join("");
};

/** A `{ plaintext, facets }` text block that links to `targetUrl`, rendered. */
const renderIfLinks = (
	// biome-ignore lint/suspicious/noExplicitAny: raw block JSON
	block: any,
	targetUrl: string,
): string | null => {
	if (typeof block?.plaintext !== "string" || !Array.isArray(block.facets)) {
		return null;
	}
	return facetsLinkTo(block.facets, targetUrl)
		? renderRichText(block.plaintext, block.facets)
		: null;
};

// --- Leaflet (`pub.leaflet.content`) ---

/**
 * Find the first leaflet block (text/header/blockquote — anything with
 * `plaintext` + `facets`) whose facets link to `targetUrl`. Handles both
 * `linearDocument` and `canvas` pages (both carry blocks as `{ block: … }`).
 */
const findLeafletLinkParagraph = (
	content: StandardSiteRecord,
	targetUrl: string,
): string | null => {
	const pages = Array.isArray(content.pages) ? content.pages : [];
	for (const page of pages) {
		const blocks = Array.isArray(page?.blocks) ? page.blocks : [];
		for (const wrapper of blocks) {
			const rendered = renderIfLinks(wrapper?.block, targetUrl);
			if (rendered) return rendered;
		}
	}
	return null;
};

// --- Flat-items apps (Offprint `app.offprint.content`, Pckt `blog.pckt.content`) ---

/** A block's local name — the last `.`-segment of its `$type` NSID. */
const blockName = (type: unknown): string =>
	typeof type === "string" ? (type.split(".").pop() ?? "") : "";

/** Local names of blocks that carry `plaintext` + `facets` directly. */
const TEXT_BLOCK_NAMES = new Set(["text", "heading", "callout"]);
/** Local names of link-bookmark blocks (Offprint `webBookmark`, Pckt `website`). */
const BOOKMARK_BLOCK_NAMES = new Set(["webBookmark", "website"]);

/**
 * Find the first block in a flat `items[]` body that links to `targetUrl`.
 * Text/heading/callout blocks carry `plaintext` + `facets` directly; blockquote
 * nests blocks under `content`; bookmark blocks (Offprint `webBookmark`.href,
 * Pckt `website`.src) point at a URL and render their title. Block `$type`s are
 * matched by local name so one walk serves every flat-items app.
 */
const findFlatItemsLinkParagraph = (
	// biome-ignore lint/suspicious/noExplicitAny: raw block list JSON
	blocks: any[],
	targetUrl: string,
): string | null => {
	for (const block of blocks) {
		const name = blockName(block?.$type);
		if (TEXT_BLOCK_NAMES.has(name)) {
			const rendered = renderIfLinks(block, targetUrl);
			if (rendered) return rendered;
		} else if (name === "blockquote") {
			const inner = Array.isArray(block.content) ? block.content : [];
			const rendered = findFlatItemsLinkParagraph(inner, targetUrl);
			if (rendered) return rendered;
		} else if (BOOKMARK_BLOCK_NAMES.has(name)) {
			const url = block.href ?? block.src ?? block.uri ?? block.url;
			if (typeof url === "string" && urlsMatch(url, targetUrl)) {
				return typeof block.title === "string" && block.title
					? escapeHtml(block.title)
					: null;
			}
		}
	}
	return null;
};

// --- Shared envelope handling ---

/**
 * Build the public document URL: the publication's base URL (resolved by
 * `resolveLeafletPublications`, or an https `site` used directly) joined with
 * the document's `path`. Returns null when no base URL is known.
 */
const buildStandardDocUrl = (
	record: StandardSiteRecord,
	publicationUrl?: string,
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

/** Find the block linking to `targetUrl`, dispatching on the content lexicon. */
const findLinkParagraph = (
	record: StandardSiteRecord,
	targetUrl: string,
): string | null => {
	const content = record?.content;
	if (!content || typeof content !== "object") return null;
	if (content.$type === "pub.leaflet.content") {
		return findLeafletLinkParagraph(content, targetUrl);
	}
	// Offprint + Pckt share the flat-`items` shape. (Pckt may stash large bodies
	// in an external blob with no inline `items`, in which case there's nothing
	// to walk and the caller falls back to the generic line.)
	if (
		content.$type === "app.offprint.content" ||
		content.$type === "blog.pckt.content"
	) {
		const items = Array.isArray(content.items) ? content.items : [];
		return findFlatItemsLinkParagraph(items, targetUrl);
	}
	return null;
};

/**
 * Map a `site.standard.document` share to Sill's `linkPostDenormalized` shape:
 * the card body is the block that links to the shared URL (rendered rich text)
 * plus a line linking to the full document on its publication.
 */
export const standardSiteDocumentToLinkPost = (
	share: ShareRow,
	base: LinkPost,
): LinkPost => {
	let record: StandardSiteRecord = null;
	try {
		record = JSON.parse(share.record);
	} catch {
		// leave record null → bare fallback below
	}

	const source = contentSourceFor(record?.content?.$type);
	const docUrl = buildStandardDocUrl(record, share.publicationUrl);
	const title =
		typeof record?.title === "string" && record.title ? record.title : "a post";
	const docLink = docUrl
		? `<a href="${escapeAttr(docUrl)}">${escapeHtml(title)}</a>`
		: escapeHtml(title);

	const publication = escapeHtml(share.publicationName || source.defaultName);

	const paragraph = record ? findLinkParagraph(record, share.url) : null;
	// When the block is found, quote it as a blockquote with a "from {doc}"
	// line; otherwise a generic line still linking to the document. The marker
	// class also flags the card for the source logo in PostRep.
	const postText = paragraph
		? `<blockquote>${paragraph}</blockquote><p class="${source.marker}">From ${docLink} on ${publication}</p>`
		: `<p class="${source.marker}">Linked to this in ${docLink} on ${publication}.</p>`;

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
