import type { RenderedLinkPost } from "@sill/schema";
import type { ShareRow } from "../appview.js";
import { blueskyPostToLinkPost, blueskyRepostToLinkPost } from "./bluesky.js";
import { communityBookmarkToLinkPost } from "./community-bookmark.js";
import { cosmikCardToLinkPost } from "./cosmik.js";
import {
	mastodonRepostToLinkPost,
	mastodonStatusToLinkPost,
} from "./mastodon.js";
import { popfeedReviewToLinkPost } from "./popfeed.js";
import { scrobbleToLinkPost } from "./scrobble.js";
import { emptyDenormalized } from "./shared.js";
import { standardSiteDocumentToLinkPost } from "./standard-site.js";

/**
 * Map an AppView hydration `ShareRow` to Sill's `linkPostDenormalized` shape,
 * dispatching on the record's `collection`. Each collection's mapping lives in
 * its own sibling module:
 *
 * - `app.bsky.feed.post` / `app.bsky.feed.repost` → ./bluesky
 * - `mastodon.status` / `mastodon.repost` → ./mastodon
 * - `network.cosmik.card` (Semble bookmark) → ./cosmik
 * - `community.lexicon.bookmarks.bookmark` (Sill bookmark) → ./community-bookmark
 * - `site.standard.document` (Leaflet / Offprint docs) → ./standard-site
 * - `app.rocksky.scrobble` (music listen) → ./scrobble
 * - `social.popfeed.feed.review` (film / TV / game review) → ./popfeed
 *
 * Everything starts from a neutral `base` (the sharer attributed as a bare
 * Bluesky post); unknown collections fall through to the `app.bsky.feed.post`
 * mapping.
 */
export const shareRowToLinkPost = (
	share: ShareRow,
	userId: string,
): RenderedLinkPost => {
	const base = emptyDenormalized(share, userId);

	switch (share.collection) {
		case "network.cosmik.card":
			return cosmikCardToLinkPost(share, base);
		case "community.lexicon.bookmarks.bookmark":
			return communityBookmarkToLinkPost(share, base);
		case "site.standard.document":
			return standardSiteDocumentToLinkPost(share, base);
		case "app.rocksky.scrobble":
			return scrobbleToLinkPost(share, base);
		case "social.popfeed.feed.review":
			return popfeedReviewToLinkPost(share, base);
		case "mastodon.status":
			return mastodonStatusToLinkPost(share, base);
		case "mastodon.repost":
			return mastodonRepostToLinkPost(share, base);
		case "app.bsky.feed.repost":
			return blueskyRepostToLinkPost(share, base);
		default:
			// app.bsky.feed.post (normal post or quote post) + unknown collections.
			return blueskyPostToLinkPost(share, base);
	}
};
