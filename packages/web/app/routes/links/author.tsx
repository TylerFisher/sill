import { invariantResponse } from "@epic-web/invariant";
import { eq } from "drizzle-orm";
import LinksList from "~/components/linkPosts/LinksList";
import Layout from "~/components/nav/Layout";
import PageHeading from "~/components/nav/PageHeading";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import { isSubscribed, requireUserId } from "~/utils/auth.server";
import { findLinksByAuthor } from "~/utils/links.server";
import type { Route } from "./+types/author";

export const loader = async ({ request, params }: Route.LoaderArgs) => {
	const userId = await requireUserId(request);
	const existingUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
		with: {
			blueskyAccounts: true,
			mastodonAccounts: {
				with: {
					mastodonInstance: true,
				},
			},
			bookmarks: true,
		},
	});
	const subscribed = await isSubscribed(userId);

	invariantResponse(existingUser, "Not found", { status: 404 });

	const author = params.author;

	const links = await findLinksByAuthor(author);

	return {
		links,
		instance: existingUser.mastodonAccounts[0].mastodonInstance.instance,
		bsky: existingUser.blueskyAccounts[0].handle,
		bookmarks: existingUser.bookmarks,
		subscribed,
		author,
	};
};

const LinksByAuthor = ({ loaderData }: Route.ComponentProps) => {
	const { links, instance, bsky, bookmarks, subscribed, author } = loaderData;

	return (
		<Layout>
			<PageHeading title={`Links by ${author}`} />
			<LinksList
				links={links}
				instance={instance}
				bsky={bsky}
				bookmarks={bookmarks}
				subscribed={subscribed}
			/>
		</Layout>
	);
};

export default LinksByAuthor;
