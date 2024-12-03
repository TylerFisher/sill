import type { LoaderFunctionArgs } from "@remix-run/node";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7-js";
import { db } from "~/drizzle/db.server";
import {
	actor,
	linkPost,
	linkPostDenormalized,
	linkPostToUser,
	list,
	post,
	postImage,
	postListSubscription,
} from "~/drizzle/schema.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const authHeader = request.headers.get("Authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const token = authHeader.split(" ")[1];
	if (token !== process.env.CRON_API_KEY) {
		throw new Response("Forbidden", { status: 403 });
	}

	const BATCH_SIZE = 1000;
	let offset = 0;
	let hasMore = true;

	while (hasMore) {
		// Get all link posts with related data
		const allLinkPosts = await db
			.select()
			.from(linkPost)
			.innerJoin(post, eq(linkPost.postId, post.id))
			.innerJoin(actor, eq(post.actorHandle, actor.handle))
			.leftJoin(postImage, eq(post.id, postImage.postId))
			.leftJoin(linkPostToUser, eq(linkPost.id, linkPostToUser.linkPostId))
			.leftJoin(postListSubscription, eq(post.id, postListSubscription.postId))
			.leftJoin(list, eq(postListSubscription.listId, list.id))
			.limit(BATCH_SIZE)
			.offset(offset);

		if (allLinkPosts.length === 0) {
			hasMore = false;
			break;
		}

		// Group post images by post ID
		const postImagesMap = allLinkPosts.reduce(
			(acc, row) => {
				if (row.post_image) {
					if (!acc[row.post.id]) {
						acc[row.post.id] = [];
					}
					acc[row.post.id].push({
						url: row.post_image.url,
						alt: row.post_image.alt,
					});
				}
				return acc;
			},
			{} as Record<string, { url: string; alt: string }[]>,
		);

		// Get quoted posts data
		const quotedPostsMap = new Map();
		const quotedPostIds = allLinkPosts
			.filter((row) => row.post.quotingId)
			.map((row) => row.post.quotingId);

		if (quotedPostIds.length) {
			const quotedPosts = await db
				.select()
				.from(post)
				.innerJoin(actor, eq(post.actorHandle, actor.handle))
				.leftJoin(postImage, eq(post.id, postImage.postId))
				.where(eq(post.id, quotedPostIds[0] || "")); // Add proper IN clause here

			for (const qp of quotedPosts) {
				quotedPostsMap.set(qp.post.id, {
					post: qp.post,
					actor: qp.actor,
					images: postImagesMap[qp.post.id] || [],
				});
			}
		}

		// Prepare batch insert data
		const batchInsertData = allLinkPosts.map((row) => {
			const quoted = row.post.quotingId
				? quotedPostsMap.get(row.post.quotingId)
				: null;

			return {
				id: uuidv7(),
				linkUrl: row.link_post.linkUrl,
				postUrl: row.post.url,
				postText: row.post.text,
				postDate: row.post.postDate,
				postType: row.post.postType,
				postImages: postImagesMap[row.post.id] || [],
				actorUrl: row.actor.url,
				actorHandle: row.actor.handle,
				actorName: row.actor.name,
				actorAvatarUrl: row.actor.avatarUrl,
				quotedActorUrl: quoted?.actor.url,
				quotedActorHandle: quoted?.actor.handle,
				quotedActorName: quoted?.actor.name,
				quotedActorAvatarUrl: quoted?.actor.avatarUrl,
				quotedPostUrl: quoted?.post.url,
				quotedPostText: quoted?.post.text,
				quotedPostDate: quoted?.post.postDate,
				quotedPostType: quoted?.post.postType,
				quotedPostImages: quoted?.images || [],
				userId: row.link_post_to_user?.userId || "",
				listId: row.list?.id || null,
			};
		});
		// Bulk insert
		await db.insert(linkPostDenormalized).values(batchInsertData);

		offset += BATCH_SIZE;
		console.log(`Processed ${offset} records`);
	}

	return new Response("OK", { status: 200 });
};
