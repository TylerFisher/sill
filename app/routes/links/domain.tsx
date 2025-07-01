import { isSubscribed, requireUserId } from "~/utils/auth.server";
import type { Route } from "./+types/domain";
import { findLinksByDomain } from "~/utils/links.server";
import Layout from "~/components/nav/Layout";
import { db } from "~/drizzle/db.server";
import { eq } from "drizzle-orm";
import { user } from "~/drizzle/schema.server";
import { invariantResponse } from "@epic-web/invariant";
import LinkRep from "~/components/linkPosts/LinkRep";
import { useLayout } from "../resources/layout-switch";
import PageHeading from "~/components/nav/PageHeading";

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
	const layout = useLayout();

	return (
		<Layout>
			<PageHeading title={`Links from ${domain}`} />
			<div>
				{links.map((link) => (
					<LinkRep
						key={link.id}
						link={link}
						instance={instance}
						bsky={bsky}
						layout={layout}
						isBookmarked={
							!!bookmarks.find((bookmark) => bookmark.linkUrl === link.url)
						}
						subscribed={subscribed}
					/>
				))}
			</div>
		</Layout>
	);
};

export default LinksByDomain;
