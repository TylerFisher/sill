import {
	type Actor,
	type DocumentLoader,
	Link,
	getActorHandle,
	getActorTypeName,
	isActor,
	lookupObject,
} from "@fedify/fedify";
import { Visibility, type Actor as DbActor } from "@prisma/client";
import { uuidv7 } from "uuidv7-js";
import { prisma as db } from "../app/db.server";
import { toDate } from "./date";

export async function persistActor(
	actor: Actor,
	options: {
		contextLoader?: DocumentLoader;
		documentLoader?: DocumentLoader;
	} = {},
): Promise<DbActor | null> {
	const opts = { ...options, suppressError: true };
	if (
		actor.id == null ||
		actor.inboxId == null ||
		(actor.name == null && actor.preferredUsername == null)
	) {
		return null;
	}
	let handle: string;
	try {
		handle = await getActorHandle(actor);
	} catch (e) {
		if (e instanceof TypeError) return null;
		throw e;
	}
	const avatar = await actor.getIcon(opts);
	const followers = await actor.getFollowers(opts);
	const values: Omit<DbActor, "id" | "iri" | "userId"> = {
		type: getActorTypeName(actor),
		name: actor?.name?.toString() ?? actor?.preferredUsername?.toString() ?? "",
		handle,
		bioHtml: actor.summary?.toString() || null,
		url:
			(actor.url instanceof Link ? actor.url.href?.href : actor.url?.href) ||
			null,
		protected: actor.manuallyApprovesFollowers ?? false,
		avatarUrl:
			(avatar?.url instanceof Link
				? avatar.url.href?.href
				: avatar?.url?.href) || null,
		inboxUrl: actor.inboxId.href,
		followersUrl: followers?.id?.href || null,
		sharedInboxUrl: actor.endpoints?.sharedInbox?.href || null,
		followingCount: BigInt((await actor.getFollowing(opts))?.totalItems ?? 0),
		followersCount: BigInt(followers?.totalItems ?? 0),
		postsCount: BigInt((await actor.getOutbox(opts))?.totalItems ?? 0),
		published: toDate(actor.published),
		updatedAt: toDate(actor.updated) || new Date(),
		visibility: Visibility.public, // TODO
	};

	try {
		const dbActor = await db.actor.upsert({
			where: {
				iri: actor.id.href,
			},
			create: {
				id: uuidv7(),
				iri: actor.id.href,
				...values,
			},
			update: {
				...values,
			},
		});

		return dbActor;
	} catch (e) {
		console.log(e);
		throw e;
	}
}

export async function persistActorByIri(
	iri: string,
	options: {
		contextLoader?: DocumentLoader;
		documentLoader?: DocumentLoader;
	} = {},
): Promise<DbActor | null> {
	const dbActor = await db.actor.findFirst({
		where: {
			iri,
		},
	});
	if (dbActor != null) return dbActor;
	const actor = await lookupObject(iri, options);
	if (!isActor(actor) || actor.id == null) return null;
	return await persistActor(actor, options);
}

export async function updateActorStats(
	actor: { id: string } | { iri: string },
): Promise<void> {
	let id = null;
	if ("id" in actor) {
		id = actor.id;
	} else {
		const dbActor = await db.actor.findFirst({
			select: {
				id: true,
			},
			where: {
				iri: actor.iri,
			},
		});
		id = dbActor?.id;
	}

	const followingCount = await db.follow.count({
		where: {
			followerId: id,
			approved: {
				not: null,
			},
		},
	});
	const followersCount = await db.follow.count({
		where: {
			followingId: id,
			approved: {
				not: null,
			},
		},
	});
	const postsCount = await db.post.count({
		where: {
			actorId: id,
		},
	});
	await db.actor.update({
		where: {
			id,
		},
		data: {
			followingCount,
			followersCount,
			postsCount,
		},
	});
}
