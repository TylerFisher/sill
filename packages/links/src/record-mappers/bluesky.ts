import type { LinkPost } from "@sill/schema";
import type { ShareRow } from "../appview.js";
import {
	extractImagesFromRecord,
	isEmptyRecord,
	parseRecord,
	postUrlFromAtUri,
	profileUrl,
	quotedFields,
	serializeRecord,
	toDbDate,
} from "./shared.js";

/**
 * `app.bsky.feed.repost`: the card body is the ORIGINAL post (from `subject`),
 * with the reposter moved to `repostActor*` so the card reads as the original
 * with a "reposted by" banner. A repost OF a quote post fills `quoted*` from
 * the subject's own subject. Returns the bare `base` (the reposter) when the
 * original couldn't be resolved (`subject` absent/empty).
 */
export const blueskyRepostToLinkPost = (
	share: ShareRow,
	base: LinkPost,
): LinkPost => {
	if (!share.subject || isEmptyRecord(share.subject.record)) return base;
	const subjectRecord = parseRecord(share.subject.record);
	const nestedQuote =
		share.subject.subject && !isEmptyRecord(share.subject.subject.record)
			? quotedFields(share.subject.subject)
			: null;
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
		...nestedQuote,
	};
};

/**
 * `app.bsky.feed.post`: a normal post, or a quote post when `subject` is set.
 * `actor*` is the sharer; the resolved `subject` fills the `quoted*` fields.
 */
export const blueskyPostToLinkPost = (
	share: ShareRow,
	base: LinkPost,
): LinkPost => {
	const record = parseRecord(share.record);
	const post: LinkPost = {
		...base,
		postUrl: postUrlFromAtUri(share.atUri, share.actorHandle),
		postText: serializeRecord(record),
		postDate: toDbDate(record?.createdAt) ?? base.postDate,
		postImages: extractImagesFromRecord(record, share.actorDid),
	};

	if (share.subject && !isEmptyRecord(share.subject.record)) {
		Object.assign(post, quotedFields(share.subject));
	}
	return post;
};
