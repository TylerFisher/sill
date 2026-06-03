import { type LinkPost, postType } from "@sill/schema";
import type { ShareRow } from "../appview.js";
import { toDbDate } from "./shared.js";

/**
 * `network.cosmik.card` is a bookmark on Semble. Render it as a bookmark card
 * ("{actor} bookmarked this URL on Semble") linking to the Semble page for the
 * bookmarked URL taken from the record (the raw, non-canonical URL).
 */
export const cosmikCardToLinkPost = (
	share: ShareRow,
	base: LinkPost,
): LinkPost => {
	let recordUrl = share.url; // fall back to the canonical URL
	let createdAt: string | undefined;
	try {
		// The bookmarked URL lives at `content.url` (the raw URL, with its original
		// trailing slash intact); `createdAt` is top-level. There is no top-level
		// `record.url` — reading it would always fall back to Sill's canonical URL.
		const record = JSON.parse(share.record) as {
			content?: { url?: string };
			createdAt?: string;
		};
		if (typeof record.content?.url === "string") recordUrl = record.content.url;
		if (typeof record.createdAt === "string") createdAt = record.createdAt;
	} catch {
		// keep the canonical URL / share eventTime
	}
	// Semble keys its page on the exact bookmarked URL, so pass it raw (NOT
	// percent-encoded) — the `?id=` value is the verbatim URL, trailing slash and
	// all. `sembleTab=addedBy` opens the "Added by" tab (who bookmarked it), e.g.
	// `?id=https://gui.do/post/foo/&sembleTab=addedBy`.
	const sembleUrl = `https://semble.so/url?id=${recordUrl}&sembleTab=addedBy`;
	const profileUrl = `https://semble.so/profile/${
		share.actorHandle || share.actorDid
	}`;
	return {
		...base,
		postType: postType.enumValues[2], // "atbookmark"
		// Carries the Semble page for the bookmarked URL (built from the *raw*
		// record URL, not Sill's canonical link). Semble shares roll up into a
		// single per-link card on the web, where this is the "Semble" link; it is
		// no longer used for `groupBy` (the rollup keys by collection).
		postUrl: sembleUrl,
		// Date by when the bookmark was made (falls back to the share eventTime).
		postDate: toDbDate(createdAt) ?? base.postDate,
		postText: `Bookmarked this on <a href="${sembleUrl}">Semble</a>.`,
		actorUrl: profileUrl,
	};
};
