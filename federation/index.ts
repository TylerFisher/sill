import {
	Accept,
	Activity,
	Announce,
	Article,
	Create,
	Delete,
	Endpoints,
	Follow,
	Image,
	Like,
	Note,
	Reject,
	Undo,
	Update,
	createFederation,
	getActorClassByTypeName,
	importJwk,
	isActor,
} from "@fedify/fedify";

import { RedisKvStore, RedisMessageQueue } from "@fedify/redis";
import { prisma as db } from "~/db.server";
import redis, { createRedis } from "~/redis.server";
import { persistActor, updateActorStats } from "./account";
import { toTemporalInstant } from "./date";
import {
	persistPost,
	persistSharingPost,
	toAnnounce,
	toCreate,
	toObject,
	updatePostStats,
} from "./post";

export const federation = createFederation({
	kv: new RedisKvStore(redis),
	queue: new RedisMessageQueue(createRedis, {
		loopInterval: { seconds: 2, milliseconds: 500 },
	}),
});

federation
	.setActorDispatcher("/@{handle}", async (ctx, handle) => {
		const actor = await db.actor.findFirst({
			where: {
				handle: handle,
			},
		});
		if (actor == null) return null;
		const cls = getActorClassByTypeName(actor.type);

		return new cls({
			id: new URL(actor.iri),
			name: actor.name,
			preferredUsername: handle,
			summary: actor.bioHtml,
			url: actor.url ? new URL(actor.url) : null,
			manuallyApprovesFollowers: actor.protected,
			icon: actor.avatarUrl
				? new Image({ url: new URL(actor.avatarUrl) })
				: null,
			published: actor.published ? toTemporalInstant(actor.published) : null,
			publicKey: (await ctx.getActorKeyPairs(handle))[0].cryptographicKey,
			assertionMethods: (await ctx.getActorKeyPairs(handle)).map(
				(pair) => pair.multikey,
			),
			followers: ctx.getFollowersUri(handle),
			following: ctx.getFollowingUri(handle),
			outbox: ctx.getOutboxUri(handle),
			liked: ctx.getLikedUri(handle),
			inbox: ctx.getInboxUri(handle),
			endpoints: new Endpoints({
				sharedInbox: ctx.getInboxUri(),
			}),
		});
	})
	.setKeyPairsDispatcher(async (_ctx, handle) => {
		const actor = await db.actor.findFirst({
			where: {
				handle: handle,
			},
			include: {
				actorKeys: true,
			},
		});
		if (actor == null || actor.actorKeys == null) return [];
		return [
			{
				privateKey: await importJwk(
					actor.actorKeys.rsaPrivateKeyJWK as JsonWebKey,
					"private",
				),
				publicKey: await importJwk(
					actor.actorKeys.rsaPublicKeyJWK as JsonWebKey,
					"public",
				),
			},
			{
				privateKey: await importJwk(
					actor.actorKeys.ed25519PrivateKeyJWK as JsonWebKey,
					"private",
				),
				publicKey: await importJwk(
					actor.actorKeys.ed25519PublicKeyJWK as JsonWebKey,
					"public",
				),
			},
		];
	});

federation
	.setFollowersDispatcher(
		"/@{handle}/followers",
		async (_ctx, handle, cursor) => {
			const actor = await db.actor.findFirst({
				where: {
					handle,
				},
			});
			if (actor == null || cursor == null) return null;
			const offset = Number.parseInt(cursor);
			if (!Number.isInteger(offset)) return null;

			const followers = await db.follow.findMany({
				select: {
					follower: true,
				},
				where: {
					followingId: actor.id,
					approved: {
						not: null,
					},
				},
				take: 51,
				skip: offset,
				orderBy: {
					followerId: "asc",
				},
			});

			return {
				items: followers.slice(0, 50).map((f) => ({
					id: new URL(f.follower.iri),
					inboxId: new URL(f.follower.inboxUrl),
					endpoints: {
						sharedInbox: f.follower.sharedInboxUrl
							? new URL(f.follower.sharedInboxUrl)
							: null,
					},
				})),
				nextCursor: followers.length > 50 ? `${offset + 50}` : null,
			};
		},
	)
	.setFirstCursor(async (_ctx, _handle) => "0")
	.setCounter(async (_ctx, handle) => {
		const actor = await db.actor.findFirst({
			where: {
				handle,
			},
		});
		return actor == null ? 0 : actor.followersCount;
	});

federation
	.setFollowingDispatcher(
		"/@{handle}/following",
		async (_ctx, handle, cursor) => {
			const actor = await db.actor.findFirst({
				where: {
					handle,
				},
			});
			if (actor == null || cursor == null) return null;
			const offset = Number.parseInt(cursor);
			if (!Number.isInteger(offset)) return null;

			const following = await db.follow.findMany({
				select: {
					following: true,
				},
				where: {
					followerId: actor.id,
					approved: {
						not: null,
					},
				},
				take: 51,
				skip: offset,
				orderBy: {
					followingId: "asc",
				},
			});

			return {
				items: following.slice(0, 50).map((f) => new URL(f.following.iri)),
				nextCursor: following.length > 50 ? `${offset + 50}` : null,
			};
		},
	)
	.setFirstCursor(async (_ctx, _handle) => "0")
	.setCounter(async (_ctx, handle) => {
		const actor = await db.actor.findFirst({
			where: {
				handle,
			},
		});
		return actor == null ? 0 : actor.followingCount;
	});

federation
	.setOutboxDispatcher("/@{handle}/outbox", async (ctx, handle, cursor) => {
		const actor = await db.actor.findFirst({
			where: {
				handle,
			},
		});
		if (actor == null || cursor == null) return null;
		const offset = Number.parseInt(cursor);
		if (!Number.isInteger(offset)) return null;

		const items = await db.post.findMany({
			where: {
				actorId: actor.id,
			},
			orderBy: {
				published: "desc",
			},
			skip: offset,
			take: 51,
			include: {
				actor: true,
				replyTarget: true,
				media: true,
				mentions: { include: { actor: true } },
				sharing: { include: { actor: true } },
			},
		});
		return {
			items: items
				.slice(0, 50)
				.map((p) =>
					p.sharing == null ? toCreate(p, ctx) : toAnnounce(p, ctx),
				),
			nextCursor: items.length > 50 ? `${Number.parseInt(cursor) + 50}` : null,
		};
	})
	.setFirstCursor(async (_ctx, _handle) => "0")
	.setCounter(async (_ctx, handle) => {
		const actor = await db.actor.findFirst({
			where: {
				handle,
			},
		});
		if (actor == null) return null;
		const result = await db.post.count({
			where: {
				actorId: actor.id,
			},
		});
		return result;
	});

federation
	.setLikedDispatcher("/@{handle}/liked", async (_ctx, handle, cursor) => {
		const actor = await db.actor.findFirst({
			where: {
				handle,
			},
		});
		if (actor == null || cursor == null) return null;
		const offset = Number.parseInt(cursor);
		if (!Number.isInteger(offset)) return null;
		const items = await db.like.findMany({
			where: {
				actorId: actor.id,
			},
			orderBy: {
				createdAt: "desc",
			},
			take: 51,
			skip: offset,
			include: {
				post: true,
			},
		});
		return {
			items: items.slice(0, 50).map(
				(like) =>
					new Like({
						id: new URL(`#likes/${like.createdAt.toISOString()}`, actor.iri),
						actor: new URL(actor.iri),
						object: new URL(like.post.iri),
					}),
			),
			nextCursor: items.length > 50 ? `${Number.parseInt(cursor) + 50}` : null,
		};
	})
	.setFirstCursor(async (_ctx, _handle) => "0")
	.setCounter(async (_ctx, handle) => {
		const actor = await db.actor.findFirst({
			where: {
				handle,
			},
		});
		if (actor == null) return null;
		const result = await db.like.count({
			where: {
				actorId: actor.id,
			},
		});
		return result;
	});

federation
	.setInboxListeners("/@{handle}/inbox", "/inbox")
	.setSharedKeyDispatcher(async (_) => {
		const anyActor = await db.actor.findFirst();
		return anyActor ?? null;
	})
	.on(Follow, async (ctx, follow) => {
		console.log("received follow", follow);
		if (follow.id == null) return;
		const actor = await follow.getActor();
		if (!isActor(actor) || actor.id == null) {
			return;
		}
		const object = await follow.getObject();
		if (!isActor(object) || object.id == null) {
			return;
		}
		const following = await db.actor.findFirst({
			where: {
				iri: object.id.href,
			},
		});
		if (following == null) {
			return;
		}
		const follower = await persistActor(actor, ctx);
		if (follower == null) return;
		await db.follow.create({
			data: {
				iri: follow.id.href,
				followingId: following.id,
				followerId: follower.id,
				approved: following.protected ? null : new Date(),
			},
		});
		if (!following.protected) {
			await ctx.sendActivity(
				following,
				actor,
				new Accept({
					id: new URL(
						`#accepts/${follower.iri}`,
						ctx.getActorUri(following.handle),
					),
					actor: object.id,
					object: follow,
				}),
			);
			await updateActorStats({ id: following.id });
		}
	})
	.on(Accept, async (ctx, accept) => {
		const actor = accept.getActor();
		if (!isActor(actor) || actor.id == null) {
			return;
		}
		const account = await persistActor(actor, ctx);
		if (account == null) return;
		if (accept.objectId != null) {
			const updated = await db.follow.update({
				where: {
					iri: accept.objectId.href,
				},
				data: {
					approved: new Date(),
				},
			});
			if (updated) {
				await updateActorStats({ id: updated.followerId });
				return;
			}
		}
		const object = accept.getObject();
		if (object instanceof Follow) {
			if (object.actorId == null) return;
			const actor = await db.actor.findFirst({
				select: {
					id: true,
				},
				where: {
					iri: object.actorId.href,
				},
			});
			await db.follow.updateMany({
				where: {
					followerId: actor?.id,
					followingId: account.id,
				},
				data: {
					approved: new Date(),
				},
			});
			await updateActorStats({ iri: object.actorId.href });
		}
	})
	.on(Reject, async (ctx, reject) => {
		const actor = await reject.getActor();
		if (!isActor(actor) || actor.id == null) {
			return;
		}
		const account = await persistActor(actor, ctx);
		if (account == null) return;
		if (reject.objectId != null) {
			const deleted = await db.follow.delete({
				where: {
					iri: reject.objectId.href,
				},
			});
			if (deleted) {
				await updateActorStats({ id: deleted.followerId });
				return;
			}
		}
		const object = await reject.getObject();
		if (object instanceof Follow) {
			if (object.actorId == null) return;
			const actorAccount = await db.actor.findFirst({
				select: {
					id: true,
				},
				where: {
					iri: object.actorId.href,
				},
			});
			await db.follow.deleteMany({
				where: {
					followerId: actorAccount?.id,
					followingId: account.id,
				},
			});
			await updateActorStats({ iri: object.actorId.href });
		}
	})
	.on(Create, async (ctx, create) => {
		const object = await create.getObject();
		if (object instanceof Article || object instanceof Note) {
			const post = await persistPost(object, ctx);
			if (post?.replyTargetId != null) {
				await updatePostStats({ id: post.replyTargetId });
			}
		}
	})
	.on(Like, async (ctx, like) => {
		if (like.objectId == null) return;
		const parsed = ctx.parseUri(like.objectId);
		if (parsed == null) return;
		const { type } = parsed;
		if (
			type === "object" &&
			(parsed.class === Note || parsed.class === Article)
		) {
			const actor = await like.getActor();
			if (actor == null) return;
			const account = await persistActor(actor, ctx);
			if (account == null) return;
			const postId = parsed.values.id;
			await db.like.create({
				data: {
					postId,
					actorId: account.id,
				},
			});
			await updatePostStats({ id: postId });
		}
	})
	.on(Announce, async (ctx, announce) => {
		const object = await announce.getObject();
		if (object instanceof Article || object instanceof Note) {
			const post = await persistSharingPost(announce, object, ctx);
			if (post?.sharingId != null) {
				await updatePostStats({ id: post.sharingId });
			}
		}
	})
	.on(Update, async (ctx, update) => {
		const object = update.getObject();
		if (isActor(object)) {
			await persistActor(object, ctx);
		} else if (object instanceof Article || object instanceof Note) {
			await persistPost(object, ctx);
		}
	})
	.on(Delete, async (_ctx, del) => {
		const actorId = del.actorId;
		const objectId = del.objectId;
		if (actorId == null || objectId == null) return;
		if (objectId.href === actorId.href) {
			await db.actor.delete({
				where: {
					iri: actorId.href,
				},
			});
		} else {
			const deletedPost = await db.post.delete({
				where: {
					iri: objectId.href,
				},
			});

			if (deletedPost) {
				if (deletedPost.replyTargetId != null) {
					await updatePostStats({ id: deletedPost.replyTargetId });
				}
				if (deletedPost.sharingId != null) {
					await updatePostStats({ id: deletedPost.sharingId });
				}
			}
		}
	})
	.on(Undo, async (ctx, undo) => {
		const object = await undo.getObject();
		if (
			object instanceof Activity &&
			object.actorId?.href !== undo.actorId?.href
		) {
			return;
		}
		if (object instanceof Follow) {
			if (object.id == null) return;
			const actor = await undo.getActor();
			if (!isActor(actor) || actor.id == null) {
				return;
			}
			const account = await persistActor(actor, ctx);
			if (account == null) return;
			const deleted = await db.follow.delete({
				where: {
					iri: object.id.href,
				},
			});
			if (deleted) {
				await updateActorStats({ id: deleted.followingId });
			}
		} else if (object instanceof Like) {
			const like = object;
			if (like.objectId == null) return;
			const parsed = ctx.parseUri(like.objectId);
			if (parsed == null) return;
			if (parsed instanceof Article || parsed instanceof Note) {
				const actor = await like.getActor();
				if (actor == null) return;
				const account = await persistActor(actor, ctx);
				if (account == null) return;
				const postId = parsed.id;
				if (postId == null) return;
				await db.like.deleteMany({
					where: {
						postId: postId.href,
						actorId: account.id,
					},
				});
				await updatePostStats({ id: postId.href });
			}
		} else if (object instanceof Announce) {
			const sharer = object.actorId;
			const originalPostId = object.objectId;
			if (sharer == null || originalPostId == null) return;
			const sharerActor = await db.actor.findFirst({
				where: {
					iri: sharer?.href,
				},
			});
			const originalPost = await db.post.findFirst({
				where: {
					iri: originalPostId.href,
				},
			});
			if (!sharerActor || !originalPost) return;
			const deleted = await db.post.deleteMany({
				where: {
					actorId: sharerActor.id,
					sharingId: originalPost.id,
				},
			});
			if (deleted.count > 0) {
				await updatePostStats({ id: originalPost.id });
			}
		}
	});

federation.setObjectDispatcher(Note, "/@{handle}/{id}", async (ctx, values) => {
	const actor = await db.actor.findFirst({
		where: {
			handle: values.handle,
		},
	});
	if (actor == null) return null;

	const post = await db.post.findFirst({
		where: {
			id: values.id,
			actorId: actor.id,
		},
		include: {
			actor: true,
			replyTarget: true,
			media: true,
			mentions: {
				include: {
					actor: true,
				},
			},
			sharing: { include: { actor: true } },
		},
	});
	if (post == null) return null;

	if (post.visibility === "private") {
		const keyOwner = await ctx.getSignedKeyOwner();
		if (keyOwner?.id == null) return null;
		const found = await db.follow.findFirst({
			where: {
				followerId: keyOwner.id.href,
				followingId: actor.id,
			},
		});
		if (found == null) return null;
	} else if (post.visibility === "direct") {
		const keyOwner = await ctx.getSignedKeyOwner();
		const keyOwnerId = keyOwner?.id;
		if (keyOwnerId == null) return null;
		const found = post.mentions.some((m) => m.actor.iri === keyOwnerId.href);
		if (!found) return null;
	}
	return toObject(post, ctx);
});

export default federation;
