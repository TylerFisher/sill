import { type LinkPost, postType } from "@sill/schema";
import type { ShareRow } from "../appview.js";
import {
	escapeAttr,
	escapeHtml,
	profileUrl,
	safeHref,
	toDbDate,
} from "./shared.js";

/**
 * `app.rocksky.scrobble` is a music listen logged by Rocksky. The AppView
 * aggregates it under the track's streaming URL (the `spotifyLink`), so the
 * link card already shows the track + album art; this builds a one-line
 * "Listened to {title} by {artist}" post body with an album/year subline. The
 * `scrobble-card` marker class flags it for the Rocksky logo in PostRep.
 *
 * Styles are inline rather than via PostContent.module.css — the body is
 * injected through `dangerouslySetInnerHTML`, so CSS-module-scoped class names
 * wouldn't match.
 */
interface ScrobbleRecord {
	title?: string;
	artist?: string;
	album?: string;
	albumArtist?: string;
	year?: number;
	genre?: string;
	createdAt?: string;
	spotifyLink?: string;
	tidalLink?: string;
	appleMusicLink?: string;
	youtubeLink?: string;
}

/**
 * Permalink to a scrobble on rocksky.app, built from the record's at:// URI:
 * `https://rocksky.app/<url-encoded did>/scrobble/<rkey>`. Returns null if the
 * URI isn't a well-formed `at://<did>/<collection>/<rkey>`.
 */
const scrobbleUrl = (atUri: string): string | null => {
	const parts = atUri.replace("at://", "").split("/");
	if (parts.length < 3) return null;
	const did = parts[0];
	const rkey = parts[parts.length - 1];
	if (!did || !rkey) return null;
	return `https://rocksky.app/${encodeURIComponent(did)}/scrobble/${rkey}`;
};

export const scrobbleToLinkPost = (
	share: ShareRow,
	base: LinkPost,
): LinkPost => {
	let record: ScrobbleRecord = {};
	try {
		record = JSON.parse(share.record) as ScrobbleRecord;
	} catch {
		// leave record empty → fall back to the canonical URL / share eventTime
	}

	const title = record.title?.trim() || "a track";
	const artist = record.artist?.trim() || record.albumArtist?.trim() || "";
	const album = record.album?.trim() || "";
	// Link the track to the best available streaming URL; the aggregated share
	// URL (usually the Spotify link) is the safe default.
	const trackHref =
		safeHref(share.url) ||
		safeHref(record.spotifyLink ?? "") ||
		safeHref(record.tidalLink ?? "") ||
		safeHref(record.appleMusicLink ?? "") ||
		safeHref(record.youtubeLink ?? "");
	const profile = profileUrl(share.actorHandle || share.actorDid);

	// Secondary line: "Album · 2024 · Genre" (only the parts we have).
	const subParts = [
		album,
		typeof record.year === "number" ? String(record.year) : "",
		record.genre?.trim() ?? "",
	].filter(Boolean);

	const titleHtml = trackHref
		? `<a href="${escapeAttr(trackHref)}"><strong>${escapeHtml(title)}</strong></a>`
		: `<strong>${escapeHtml(title)}</strong>`;
	const line = artist
		? `Listened to ${titleHtml} by ${escapeHtml(artist)}`
		: `Listened to ${titleHtml}`;
	const sub = subParts.length
		? `<div style="font-size: var(--font-size-1); color: var(--gray-11); margin-top: var(--space-1)">${escapeHtml(
				subParts.join(" · "),
			)}</div>`
		: "";

	// `scrobble-card` marker class flags the card for the Rocksky logo in PostRep.
	const postText = `<div class="scrobble-card"><div>${line}</div>${sub}</div>`;

	return {
		...base,
		postType: postType.enumValues[2], // "atbookmark" (non-bsky/mastodon collection)
		// Link the post to the scrobble record on rocksky.app. This is unique per
		// listen (the rkey), so repeat listens by one person no longer collapse —
		// each scrobble is its own entry, consistent with linking the exact record.
		postUrl: scrobbleUrl(share.atUri) ?? profile,
		postDate: toDbDate(record.createdAt) ?? base.postDate,
		postText,
		actorUrl: profile,
	};
};
