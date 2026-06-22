import { type RenderedLinkPost, postType } from "@sill/schema";
import type { ShareRow } from "../appview.js";
import { escapeHtml, safeHref, toDbDate } from "./shared.js";

/**
 * Popfeed mirrors Bluesky's profile route, so the same handle/DID resolves on
 * popfeed.social. Reviewers should land on the user's Popfeed profile, not the
 * bsky.app one.
 */
const popfeedProfileUrl = (handleOrDid: string): string =>
	`https://popfeed.social/profile/${handleOrDid}`;

/**
 * `social.popfeed.feed.review` is a film / TV / game review on Popfeed. The link
 * card carries the work (title, poster, work type, year), so the post body is
 * just the rating and the review:
 *   - no written review → "rated this {type} {stars}" (e.g. "rated this movie ★★★★☆")
 *   - a written review  → the star rating, then the review text
 * Links to the Popfeed review permalink.
 *
 * Styles are inline rather than via PostContent.module.css — the body is
 * injected through `dangerouslySetInnerHTML`, so CSS-module class names wouldn't
 * match. The source logo is keyed off the rendered post's `collection` in PostRep.
 */
interface ReviewRecord {
	text?: string;
	rating?: number; // 0–10
	creativeWorkType?: string;
	containsSpoilers?: boolean;
	createdAt?: string;
}

/**
 * Popfeed rates on a 0–10 scale; render it as five stars (rating / 2), rounded
 * to the nearest half star. e.g. 8 → ★★★★☆, 7 → ★★★½☆, 9 → ★★★★½.
 */
const ratingStars = (rating: number): string => {
	const half = Math.round(Math.max(0, Math.min(10, rating))) / 2;
	const full = Math.floor(half);
	const hasHalf = half - full === 0.5;
	const empty = 5 - full - (hasHalf ? 1 : 0);
	return "★".repeat(full) + (hasHalf ? "½" : "") + "☆".repeat(empty);
};

/**
 * Humanize a work type for the "rated this {type}" sentence: `video_game` →
 * `video game`, `tvShow` → `TV show`, `movie` → `movie`. Lowercase (it sits
 * mid-sentence) with `tv` special-cased to `TV`.
 */
const humanizeWorkType = (t: string): string =>
	t
		.replace(/_/g, " ")
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.toLowerCase()
		.replace(/\btv\b/g, "TV");

export const popfeedReviewToLinkPost = (
	share: ShareRow,
	base: RenderedLinkPost,
): RenderedLinkPost => {
	let record: ReviewRecord = {};
	try {
		record = JSON.parse(share.record) as ReviewRecord;
	} catch {
		// leave empty → fall back to the canonical URL / share eventTime
	}

	// The Popfeed review permalink is `…/review/<at-uri>`. Build it from the
	// authoritative at:// URI; fall back to the share's canonical URL.
	const reviewUrl = share.atUri
		? `https://popfeed.social/review/${share.atUri}`
		: (safeHref(share.url) ?? "");
	const profile = popfeedProfileUrl(share.actorHandle || share.actorDid);

	const hasRating = typeof record.rating === "number";
	const stars = hasRating ? ratingStars(record.rating as number) : "";
	// The stars live in a `popfeed-rating` span (unicode, for email/RSS); the web
	// feed renders lucide stars at the span's exact position instead (PostContent
	// splits on it). The `<br>` for the review case sits *outside* the span so it
	// survives that split — stars, line break, then the review text.
	const starsSpan = stars
		? `<span class="popfeed-rating" style="white-space: nowrap">${stars}</span>`
		: "";

	const reviewText = record.text?.trim();
	const showText = reviewText && !record.containsSpoilers;

	let postText: string;
	if (showText) {
		// Star rating, then the review text.
		const reviewHtml = escapeHtml(reviewText as string).replace(
			/\n/g,
			"<br />",
		);
		postText = stars ? `${starsSpan}<br />${reviewHtml}` : reviewHtml;
	} else {
		// "rated this {type} {stars}". The work type lives in the link card too,
		// but reads naturally here; year/credit/title are link-card only.
		const type = record.creativeWorkType
			? humanizeWorkType(record.creativeWorkType)
			: "";
		const phrase = type ? `rated this ${escapeHtml(type)}` : "rated this";
		postText = stars ? `${phrase} ${starsSpan}` : phrase;
	}

	return {
		...base,
		postType: postType.enumValues[2], // "atbookmark" (non-bsky/mastodon collection)
		postUrl: reviewUrl || profile,
		postDate: toDbDate(record.createdAt) ?? base.postDate,
		postText,
		actorUrl: profile,
		// 0–10 score; the web feed renders this as lucide stars (the unicode copy
		// in postText covers every other surface).
		rating: hasRating ? (record.rating as number) : null,
	};
};
