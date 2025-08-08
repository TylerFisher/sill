import { invariantResponse } from "@epic-web/invariant";
import LinksList from "~/components/linkPosts/LinksList";
import Layout from "~/components/nav/Layout";
import PageHeading from "~/components/nav/PageHeading";
import { findLinksByDomain } from "~/utils/links.server";
import type { Route } from "./+types/domain";
import { requireUserFromContext } from "~/utils/context.server";

export const loader = async ({ params, context }: Route.LoaderArgs) => {
	const existingUser = await requireUserFromContext(context);
	const subscribed = existingUser.subscriptionStatus;

	invariantResponse(existingUser, "Not found", { status: 404 });

	const domain = params.domain;

	const links = await findLinksByDomain(domain);

	return {
		links,
		instance: existingUser.mastodonAccounts[0].mastodonInstance.instance,
		bsky: existingUser.blueskyAccounts[0].handle,
		bookmarks: existingUser.bookmarks,
		subscribed,
		domain,
	};
};

const LinksByDomain = ({ loaderData }: Route.ComponentProps) => {
	const { links, instance, bsky, bookmarks, subscribed, domain } = loaderData;

	return (
		<Layout>
			<PageHeading title={`Links from ${domain}`} />
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

export default LinksByDomain;
