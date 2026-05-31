import { type LinkPost, postType } from "@sill/schema";
import type { ShareRow } from "../appview.js";
import { profileUrl, toDbDate } from "./shared.js";

/**
 * `community.lexicon.bookmarks.bookmark` is a platform-agnostic bookmark of a
 * URL. We don't name or link a platform — the bookmarked URL is the share's URL
 * (shown by the link card) and the bookmarker is the share's actor.
 */
export const communityBookmarkToLinkPost = (
	share: ShareRow,
	base: LinkPost,
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
