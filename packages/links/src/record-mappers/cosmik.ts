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
