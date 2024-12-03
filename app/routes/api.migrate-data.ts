import type { LoaderFunctionArgs } from "@remix-run/node";
import { aliasedTable, eq, sql } from "drizzle-orm";
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

	const reposter = aliasedTable(actor, "reposter");
	const quote = aliasedTable(post, "quote");
	const quoteActor = aliasedTable(actor, "quoteActor");
	const quoteImage = aliasedTable(postImage, "quoteImage");

	while (hasMore) {
		// Get all link posts with related data
		const allLinkPosts: (typeof linkPostDenormalized.$inferInsert)[] = await db
			.select({
				linkUrl: linkPost.linkUrl,
				postUrl: post.url,
				postText: post.text,
				postDate: post.postDate,
				postType: post.postType,
				postImages: sql`CASE WHEN ${postImage.url} IS NOT NULL THEN json_build_array(json_build_object('url', ${postImage.url}, 'alt', ${postImage.alt})) ELSE '[]'::json END`,
				actorUrl: actor.url,
				actorHandle: actor.handle,
				actorName: actor.name,
				actorAvatarUrl: actor.avatarUrl,
				quotedActorUrl: quoteActor.url,
				quotedActorHandle: quoteActor.handle,
				quotedActorName: quoteActor.name,
				quotedActorAvatarUrl: quoteActor.avatarUrl,
				quotedPostUrl: quote.url,
				quotedPostText: quote.text,
				quotedPostDate: quote.postDate,
				quotedPostType: quote.postType,
				quotedPostImages: sql`CASE WHEN ${quoteImage.url} IS NOT NULL THEN json_build_array(json_build_object('url', ${quoteImage.url}, 'alt', ${quoteImage.alt})) ELSE '[]'::json END`,
				repostActorHandle: reposter.handle,
				repostActorName: reposter.name,
				repostActorAvatarUrl: reposter.avatarUrl,
				repostActorUrl: reposter.url,
				userId: linkPostToUser.userId,
				listId: postListSubscription.listId,
			})
			.from(linkPost)
			.innerJoin(post, eq(linkPost.postId, post.id))
			.innerJoin(actor, eq(post.actorHandle, actor.handle))
			.leftJoin(reposter, eq(post.repostHandle, reposter.handle))
			.leftJoin(quote, eq(post.quotingId, quote.id))
			.leftJoin(postImage, eq(post.id, postImage.postId))
			.leftJoin(linkPostToUser, eq(linkPost.id, linkPostToUser.linkPostId))
			.leftJoin(postListSubscription, eq(post.id, postListSubscription.postId))
			.leftJoin(quoteActor, eq(quote.actorHandle, quoteActor.handle))
			.leftJoin(quoteImage, eq(quote.id, quoteImage.postId))
			.leftJoin(list, eq(postListSubscription.listId, list.id))
			.limit(BATCH_SIZE)
			.offset(offset);

		if (allLinkPosts.length === 0) {
			hasMore = false;
			break;
		}

		const insert = allLinkPosts.map((linkPost) => {
			return {
				...linkPost,
				id: uuidv7(),
			};
		});

		// Prepare batch insert data
		await db.insert(linkPostDenormalized).values(insert).onConflictDoNothing();

		offset = offset + BATCH_SIZE;
		console.log("processed", offset);
	}

	return new Response("OK", { status: 200 });
};
