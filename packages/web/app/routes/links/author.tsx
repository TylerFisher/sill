import { invariantResponse } from "@epic-web/invariant";
import LinksList from "~/components/linkPosts/LinksList";
import Layout from "~/components/nav/Layout";
import PageHeading from "~/components/nav/PageHeading";
import { findLinksByAuthor } from "~/utils/links.server";
import type { Route } from "./+types/author";
import { requireUserFromContext } from "~/utils/context.server";

export const loader = async ({ params, context }: Route.LoaderArgs) => {
	const existingUser = await requireUserFromContext(context);
	const subscribed = existingUser.subscriptionStatus;

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
