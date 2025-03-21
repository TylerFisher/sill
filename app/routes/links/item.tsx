import type { Route } from "./+types/item";
import { db } from "~/drizzle/db.server";
import LinkPostRep from "~/components/linkPosts/LinkPostRep";
import { and, desc, eq, gte, ilike, notIlike, or, sql } from "drizzle-orm";
import {
	link,
	linkPostDenormalized,
	blueskyAccount,
	mastodonAccount,
	bookmark,
} from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";
import { getMutePhrases } from "~/utils/links.server";
import Layout from "~/components/nav/Layout";
import { useLayout } from "~/routes/resources/layout-switch";

export async function loader({ request, params }: Route.LoaderArgs) {
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

	const bsky = await db.query.blueskyAccount.findFirst({
		where: eq(blueskyAccount.userId, userId),
	});

	const mastodon = await db.query.mastodonAccount.findFirst({
		where: eq(mastodonAccount.userId, userId),
		with: {
			mastodonInstance: {
				columns: {
					instance: true,
				},
			},
		},
	});

	const bookmarks = await db.query.bookmark.findMany({
		where: eq(bookmark.userId, userId),
	});

	const mutePhrases = await getMutePhrases(userId);
	const urlMuteClauses = mutePhrases.flatMap((phrase) => [
		notIlike(link.url, `%${phrase.phrase}%`),
		notIlike(link.title, `%${phrase.phrase}%`),
		notIlike(link.description, `%${phrase.phrase}%`),
	]);

	const start = new Date(Date.now() - 86400000);
	// Create a CASE expression to filter out muted posts
	const postMuteCondition =
		mutePhrases.length > 0
			? sql`CASE WHEN ${or(
					...mutePhrases.flatMap((phrase) => [
						ilike(linkPostDenormalized.postText, `%${phrase.phrase}%`),
						ilike(linkPostDenormalized.actorName, `%${phrase.phrase}%`),
						ilike(linkPostDenormalized.actorHandle, `%${phrase.phrase}%`),
						ilike(linkPostDenormalized.quotedPostText, `%${phrase.phrase}%`),
						ilike(linkPostDenormalized.quotedActorName, `%${phrase.phrase}%`),
						ilike(linkPostDenormalized.quotedActorHandle, `%${phrase.phrase}%`),
						ilike(linkPostDenormalized.repostActorName, `%${phrase.phrase}%`),
						ilike(linkPostDenormalized.repostActorHandle, `%${phrase.phrase}%`),
					]),
				)} THEN NULL ELSE 1 END`
			: sql`1`;

	const grouped = await db
		.select({
			link,
			uniqueActorsCount: sql<number>`cast(count(distinct 
      CASE WHEN ${postMuteCondition} = 1 
      THEN coalesce(${linkPostDenormalized.repostActorHandle}, ${linkPostDenormalized.actorHandle}) 
      END) as int)`.as("uniqueActorsCount"),
			mostRecentPostDate: sql<Date>`max(${linkPostDenormalized.postDate})`.as(
				"mostRecentPostDate",
			),
		})
		.from(linkPostDenormalized)
		.leftJoin(link, eq(linkPostDenormalized.linkUrl, link.url))
		.where(
			and(
				eq(linkPostDenormalized.userId, userId),
				gte(linkPostDenormalized.postDate, start),
				eq(linkPostDenormalized.linkUrl, dbLink.url),
				...urlMuteClauses,
			),
		)
		.groupBy(linkPostDenormalized.linkUrl, link.id)
		.then(async (results) => {
			const postsPromise = results.map(async (result) => {
				const posts = await db
					.select()
					.from(linkPostDenormalized)
					.where(
						and(
							eq(linkPostDenormalized.linkUrl, result.link?.url || ""),
							eq(linkPostDenormalized.userId, userId),
							sql`${postMuteCondition} = 1`,
						),
					)
					.orderBy(desc(linkPostDenormalized.postDate));
				return {
					...result,
					posts,
				};
			});
			return Promise.all(postsPromise);
		});

	return {
		links: grouped[0],
		bsky: bsky?.handle,
		mastodon: mastodon?.mastodonInstance.instance,
		bookmarks,
	};
}

export default function LinkRoute({ loaderData }: Route.ComponentProps) {
	const layout = useLayout();

	return (
		<Layout>
			<LinkPostRep
				instance={loaderData.mastodon}
				bsky={loaderData.bsky}
				linkPost={loaderData.links}
				autoExpand={true}
				layout={layout}
				bookmarks={loaderData.bookmarks}
			/>
		</Layout>
	);
}
