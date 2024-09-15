import {
	type Announce,
	Article,
	type Context,
	Create,
	type DocumentLoader,
	Hashtag,
	LanguageString,
	Link,
	Note,
	PUBLIC_COLLECTION,
	isActor,
} from "@fedify/fedify";
import * as vocab from "@fedify/fedify/vocab";
import {
	type Actor,
	type Post,
	PostType,
	Prisma,
	Visibility,
} from "@prisma/client";
import sharp from "sharp";
// @ts-ignore: No type definitions available
import { isSSRFSafeURL } from "ssrfcheck";
import { uuidv7 } from "uuidv7-js";
import { prisma as db } from "~/db.server";
import { type Thumbnail, uploadThumbnail } from "~/media";
import { persistActor, persistActorByIri } from "./account";
import { toDate, toTemporalInstant } from "./date";

const postWithExtraData = Prisma.validator<Prisma.PostDefaultArgs>()({
	include: {
		actor: true,
		replyTarget: true,
		media: true,
		mentions: { include: { actor: true } },
		sharing: { include: { actor: true } },
	},
});

type PostWithExtraData = Prisma.PostGetPayload<typeof postWithExtraData>;

export async function persistPost(
	object: Article | Note,
	options: {
		contextLoader?: DocumentLoader;
		documentLoader?: DocumentLoader;
		actor?: Actor;
	} = {},
): Promise<Post | null> {
	if (object.id == null) return null;
	const objectActor = await object.getAttribution();
	if (!isActor(objectActor)) return null;
	const actor =
		options?.actor != null && options.actor.iri === objectActor.id?.href
			? options.actor
			: await persistActor(objectActor, options);

	if (actor == null) return null;
	let replyTargetId: string | null = null;
	if (object.replyTargetId != null) {
		const result = await db.post.findFirst({
			where: {
				iri: object.replyTargetId.href,
			},
			select: {
				id: true,
			},
		});
		if (!result) {
			const replyTarget = await object.getReplyTarget();
			if (replyTarget instanceof Note || replyTarget instanceof Article) {
				const replyTargetObj = await persistPost(replyTarget, options);
				replyTargetId = replyTargetObj?.id ?? null;
			}
		}
	}
	const to = new Set(object.toIds.map((url) => url.href));
	const cc = new Set(object.ccIds.map((url) => url.href));
	const tags: Record<string, string> = {};
	for await (const tag of object.getTags()) {
		if (tag instanceof Hashtag && tag.name != null && tag.href != null) {
			tags[tag.name.toString()] = tag.href.href;
		}
	}

	const values = {
		type: object instanceof Article ? PostType.Article : PostType.Note,
		actorId: actor.id,
		replyTargetId,
		sharingId: null,
		visibility: to.has(PUBLIC_COLLECTION.href)
			? Visibility.public
			: cc.has(PUBLIC_COLLECTION.href)
				? Visibility.unlisted
				: actor.followersUrl != null && to.has(actor.followersUrl)
					? Visibility.private
					: Visibility.direct,
		summaryHtml: object.summary?.toString(),
		contentHtml: object.content?.toString(),
		language:
			object.content instanceof LanguageString
				? object.content.language.compact()
				: object.summary instanceof LanguageString
					? object.summary.language.compact()
					: null,
		tags: tags,
		sensitive: object.sensitive ?? false,
		url: object.url instanceof Link ? object.url.href?.href : object.url?.href,
		repliesCount: 0, // TODO
		sharesCount: 0, // TODO
		likesCount: 0, // TODO
		published: toDate(object.published),
		updated: toDate(object.published) ?? new Date(),
	};
	const post = await db.post.upsert({
		create: {
			...values,
			id: uuidv7(),
			iri: object.id.href,
		},
		where: {
			iri: object.id.href,
		},
		update: {
			...values,
		},
	});
	if (post == null) return null;
	await db.mention.deleteMany({
		where: {
			postId: post.id,
		},
	});
	for await (const tag of object.getTags(options)) {
		if (tag instanceof vocab.Mention && tag.name != null && tag.href != null) {
			const account = await persistActorByIri(tag.href.href, options);
			if (account == null) continue;
			await db.mention.create({
				data: {
					actorId: account.id,
					postId: post.id,
				},
			});
		}
	}
	await db.media.deleteMany({
		where: {
			postId: post.id,
		},
	});

	for await (const attachment of object.getAttachments(options)) {
		if (
			!(
				attachment instanceof vocab.Image ||
				attachment instanceof vocab.Document
			)
		) {
			continue;
		}
		const url =
			attachment.url instanceof Link
				? attachment.url.href?.href
				: attachment.url?.href;

		if (url == null || !isSSRFSafeURL(url)) continue;
		const response = await fetch(url);
		const mediaType =
			response.headers.get("Content-Type") ?? attachment.mediaType;
		if (mediaType == null) continue;
		const id = uuidv7();
		let thumbnail: Thumbnail;
		let metadata: { width?: number; height?: number };
		try {
			const image = sharp(await response.arrayBuffer());
			metadata = await image.metadata();
			thumbnail = await uploadThumbnail(id, image);
		} catch (_) {
			metadata = {
				width: attachment.width ?? 512,
				height: attachment.height ?? 512,
			};
			thumbnail = {
				thumbnailUrl: url,
				thumbnailType: mediaType,
				thumbnailWidth: metadata.width ?? 512,
				thumbnailHeight: metadata.height ?? 512,
			};
		}
		await db.media.create({
			data: {
				id,
				postId: post.id,
				type: mediaType,
				url,
				description: attachment.name?.toString(),
				width: attachment.width ?? metadata.width ?? 512,
				height: attachment.height ?? metadata.height ?? 512,
				...thumbnail,
			},
		});
	}
	const postWithMedia = await db.post.findFirst({
		where: {
			iri: object.id.href,
		},
		include: {
			actor: true,
			media: true,
		},
	});

	return postWithMedia;
}

export async function persistSharingPost(
	announce: Announce,
	object: Article | Note,
	options: {
		contextLoader?: DocumentLoader;
		documentLoader?: DocumentLoader;
	} = {},
): Promise<Post | null> {
	if (announce.id == null) return null;
	const actor = await announce.getActor(options);
	if (actor == null) return null;
	const dbActor = await persistActor(actor, options);
	if (dbActor == null) return null;
	const originalPost = await persistPost(object, options);
	if (originalPost == null) return null;
	const id = uuidv7();
	const updated = new Date();
	const result = db.post.create({
		data: {
			...originalPost,
			id,
			iri: announce.id.href,
			actorId: dbActor.id,
			replyTargetId: null,
			sharingId: originalPost.id,
			visibility: announce.toIds
				.map((iri) => iri.href)
				.includes(PUBLIC_COLLECTION.href)
				? "public"
				: announce.ccIds.map((iri) => iri.href).includes(PUBLIC_COLLECTION.href)
					? "unlisted"
					: "private",
			url: originalPost.url,
			published: toDate(announce.published) ?? updated,
			updated,
			tags: originalPost.tags ?? Prisma.JsonNull,
		},
	});
	await updatePostStats({ id: originalPost.id });
	return result ?? null;
}

export async function updatePostStats({ id }: { id: string }): Promise<void> {
	const repliesCount = await db.post.count({
		where: {
			replyTargetId: id,
		},
	});
	const sharesCount = await db.post.count({
		where: {
			sharingId: id,
		},
	});
	const likesCount = await db.like.count({
		where: {
			postId: id,
		},
	});

	db.post.update({
		where: {
			id,
		},
		data: {
			repliesCount,
			sharesCount,
			likesCount,
		},
	});
}

export function toObject(
	post: PostWithExtraData,
	ctx: Context<unknown>,
): Note | Article {
	const cls = post.type === "Article" ? Article : Note;
	return new cls({
		id: new URL(post.iri),
		attribution: new URL(post.actor.iri),
		tos:
			post.visibility === "public"
				? [PUBLIC_COLLECTION]
				: post.visibility === "direct"
					? post.mentions.map((m) => new URL(m.actor.iri))
					: post.actor == null
						? []
						: [ctx.getFollowersUri(post.actor.handle || "")],
		cc: post.visibility === "unlisted" ? PUBLIC_COLLECTION : null,
		summaries:
			post.summaryHtml == null
				? []
				: post.language == null
					? [post.summaryHtml]
					: [
							post.summaryHtml,
							new LanguageString(post.summaryHtml, post.language),
						],
		contents:
			post.contentHtml == null
				? []
				: post.language == null
					? [post.contentHtml]
					: [
							post.contentHtml,
							new LanguageString(post.contentHtml, post.language),
						],
		sensitive: post.sensitive,
		tags: [
			...post.mentions.map(
				(m) =>
					new vocab.Mention({
						href: new URL(m.actor.iri),
						name: m.actor.handle,
					}),
			),
			...Object.entries(post.tags || {}).map(
				([name, url]) =>
					new vocab.Hashtag({
						name,
						href: new URL(url),
					}),
			),
		],
		replyTarget:
			post.replyTarget == null ? null : new URL(post.replyTarget.iri),
		attachments: post.media.map(
			(item) =>
				new vocab.Image({
					mediaType: item.type,
					url: new URL(item.url),
					name: item.description,
					width: item.width,
					height: item.height,
				}),
		),
		published: toTemporalInstant(post.published),
		url: post.url ? new URL(post.url) : null,
		updated: toTemporalInstant(
			post.published == null
				? post.updated
				: +post.updated === +post.published
					? null
					: post.updated,
		),
	});
}

export function toCreate(
	post: PostWithExtraData,
	ctx: Context<unknown>,
): Create {
	const object = toObject(post, ctx);
	if (object.id == null) throw new Error("Object needs ID");
	return new Create({
		id: new URL("#create", object.id),
		actor: object.attributionId,
		tos: object.toIds,
		ccs: object.ccIds,
		object,
		published: object.published,
	});
}

export function toAnnounce(
	post: PostWithExtraData,
	ctx: Context<unknown>,
): Announce {
	if (post.sharing == null) throw new Error("The post is not shared");
	const handle = post.actor.handle.replaceAll(/(?:^@)|(?:@[^@]+$)/g, "");
	return new vocab.Announce({
		id: new URL("#activity", post.iri),
		actor: new URL(post.actor.iri),
		object: new URL(post.sharing.iri),
		published: toTemporalInstant(post.published),
		to:
			post.visibility === "public"
				? vocab.PUBLIC_COLLECTION
				: ctx.getFollowersUri(handle),
		ccs: [
			new URL(post.sharing.actor.iri),
			...(post.visibility === "private"
				? []
				: [
						post.visibility === "public"
							? ctx.getFollowersUri(handle)
							: vocab.PUBLIC_COLLECTION,
						new URL(post.sharing.actor.iri),
					]),
		],
	});
}
