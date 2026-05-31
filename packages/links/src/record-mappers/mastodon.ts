import { type LinkPost, postType } from "@sill/schema";
import type { ShareRow } from "../appview.js";
import {
	isEmptyRecord,
	mastodonProfileUrl,
	parseMastodonRecord,
	quotedFields,
	toDbDate,
} from "./shared.js";

/**
 * `mastodon.status`: a Mastodon post or quote-post. The AppView synthesises
 * the record body with `text`/`createdAt`/`uri`; `atUri` is the Mastodon HTTP
 * permalink (use as-is). `actorDid` is the ActivityPub Actor URI Sill pushed
 * up — its own profile URL. When `subject` is set the post is a quote;
 * `quotedFields` infers Mastodon vs Bluesky from the subject's `atUri` shape.
 */
export const mastodonStatusToLinkPost = (
	share: ShareRow,
	base: LinkPost,
): LinkPost => {
	const record = parseMastodonRecord(share.record);
	const post: LinkPost = {
		...base,
		postType: postType.enumValues[1], // "mastodon"
		postUrl: share.atUri,
		postText: record?.text ?? "",
		postDate: toDbDate(record?.createdAt) ?? base.postDate,
		actorUrl: mastodonProfileUrl(share.actorDid),
	};

	if (share.subject && !isEmptyRecord(share.subject.record)) {
		Object.assign(post, quotedFields(share.subject));
	}
	return post;
};

/**
 * `mastodon.repost`: a reblog of a Mastodon status. Same shape convention as
 * `app.bsky.feed.repost` — the reposted post lives in `subject`; the sharer
 * (actor*) is collapsed into `repostActor*` while the original author rides
 * up to the primary actor slot. Mastodon-flavoured URLs throughout.
 */
export const mastodonRepostToLinkPost = (
	share: ShareRow,
	base: LinkPost,
): LinkPost => {
	// No subject → unresolved (out-of-network original). Render the sharer with
	// a `mastodon` type so it isn't mis-typed as Bluesky.
	if (!share.subject || isEmptyRecord(share.subject.record)) {
		return {
			...base,
			postType: postType.enumValues[1], // "mastodon"
			actorUrl: mastodonProfileUrl(share.actorDid),
		};
	}
	const subjectRecord = parseMastodonRecord(share.subject.record);
	const nestedQuote =
		share.subject.subject && !isEmptyRecord(share.subject.subject.record)
			? quotedFields(share.subject.subject)
			: null;
	return {
		...base,
		postType: postType.enumValues[1], // "mastodon"
		postUrl: share.subject.atUri,
		postText: subjectRecord?.text ?? "",
		postDate: toDbDate(subjectRecord?.createdAt) ?? base.postDate,
		actorUrl: mastodonProfileUrl(share.subject.actorDid),
		actorHandle: share.subject.actorHandle || share.subject.actorDid,
		actorName: share.subject.actorName ?? null,
		actorAvatarUrl: share.subject.actorAvatar ?? null,
		repostActorUrl: mastodonProfileUrl(share.actorDid),
		repostActorHandle: share.actorHandle || share.actorDid,
		repostActorName: share.actorName ?? null,
		repostActorAvatarUrl: share.actorAvatar ?? null,
		...nestedQuote,
	};
};
