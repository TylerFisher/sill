import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { db } from "~/drizzle/db.server";
import LinkPostRep from "~/components/linkPosts/LinkPostRep";
import {
	aliasedTable,
	and,
	eq,
	gt,
	gte,
	ilike,
	inArray,
	notIlike,
	or,
	sql,
} from "drizzle-orm";
import {
	actor,
	link,
	linkPost,
	linkPostToUser,
	post,
	postImage,
} from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";
import { getMutePhrases, type PostReturn } from "~/utils/links.server";
import Layout from "~/components/nav/Layout";

export async function loader({ request, params }: LoaderFunctionArgs) {
	const linkId = params.linkId;
	const userId = await requireUserId(request);

	if (!linkId || !userId) {
		throw new Error("Missing required parameters");
	}

	const dbLink = await db.query.link.findFirst({
		where: eq(link.id, linkId),
	});

	if (!dbLink) {
		throw new Response("Link not found", { status: 404 });
	}

	const mutePhrases = await getMutePhrases(userId);
	const urlMuteClauses = mutePhrases.flatMap((phrase) => [
		notIlike(link.url, `%${phrase.phrase}%`),
		notIlike(link.title, `%${phrase.phrase}%`),
		notIlike(link.description, `%${phrase.phrase}%`),
	]);

	const start = new Date(Date.now() - 86400000);

	const linkPosts = await db.query.linkPost.findMany({
		where: and(eq(linkPost.linkUrl, dbLink.url), gt(linkPost.date, start)),
	});

	const linkPostsForUser = await db.query.linkPostToUser.findMany({
		where: and(
			inArray(
				linkPostToUser.linkPostId,
				linkPosts.map((lp) => lp.id),
			),
			eq(linkPostToUser.userId, userId),
		),
	});

	const quote = aliasedTable(post, "quote");
	const reposter = aliasedTable(actor, "reposter");
	const quoteActor = aliasedTable(actor, "quoteActor");
	const quoteImage = aliasedTable(postImage, "quoteImage");

	// Create a CASE expression to filter out muted posts
	const postMuteCondition =
		mutePhrases.length > 0
			? sql`CASE WHEN ${or(
					...mutePhrases.flatMap((phrase) => [
						ilike(post.text, `%${phrase.phrase}%`),
						ilike(actor.name, `%${phrase.phrase}%`),
						ilike(actor.handle, `%${phrase.phrase}%`),
						ilike(quote.text, `%${phrase.phrase}%`),
						ilike(quoteActor.name, `%${phrase.phrase}%`),
						ilike(quoteActor.handle, `%${phrase.phrase}%`),
						ilike(reposter.name, `%${phrase.phrase}%`),
						ilike(reposter.handle, `%${phrase.phrase}%`),
					]),
				)} THEN NULL ELSE 1 END`
			: sql`1`;

	const groupedLinks = await db
		.select({
			url: link.url,
			uniqueActorsCount: sql<number>`cast(count(distinct 
      CASE WHEN ${postMuteCondition} = 1 
      THEN coalesce(${reposter.handle}, ${actor.handle}) 
      END) as int)`.as("uniqueActorsCount"),
			posts: sql<PostReturn[]>`json_agg(
      CASE WHEN ${postMuteCondition} = 1 THEN
      json_build_object(
        'post', ${post},
        'quote', json_build_object(
        'post', ${quote},
        'actor', ${quoteActor},
        'image', ${quoteImage}
        ),
        'reposter', ${reposter},
        'image', ${postImage},
        'actor', ${actor}
      )
      END
      order by ${post.postDate} desc) filter (where ${postMuteCondition} = 1)`.as(
				"posts",
			),
			mostRecentPostDate: sql<Date>`max(${post.postDate})`.as(
				"mostRecentPostDate",
			),
		})
		.from(linkPost)
		.leftJoin(link, eq(linkPost.linkUrl, link.url))
		.leftJoin(post, eq(linkPost.postId, post.id))
		.leftJoin(actor, eq(post.actorHandle, actor.handle))
		.leftJoin(quote, eq(post.quotingId, quote.id))
		.leftJoin(reposter, eq(post.repostHandle, reposter.handle))
		.leftJoin(quoteActor, eq(quote.actorHandle, quoteActor.handle))
		.leftJoin(quoteImage, eq(quote.id, quoteImage.postId))
		.leftJoin(postImage, eq(post.id, postImage.postId))
		.where(
			and(
				inArray(
					linkPost.id,
					linkPostsForUser.map((lp) => lp.linkPostId),
				),
				gte(linkPost.date, start),
				...urlMuteClauses,
			),
		)
		.groupBy(link.url);

	return {
		uniqueActorsCount: groupedLinks[0].uniqueActorsCount,
		link: dbLink,
		posts: groupedLinks[0].posts,
		mostRecentPostDate: groupedLinks[0].mostRecentPostDate,
	};
}

export default function LinkRoute() {
	const data = useLoaderData<typeof loader>();

	return (
		<Layout>
			<LinkPostRep
				instance={undefined}
				bsky={undefined}
				linkPost={data}
				autoExpand={true}
			/>
		</Layout>
	);
}
