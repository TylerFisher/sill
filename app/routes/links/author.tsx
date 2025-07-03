import { isSubscribed, requireUserId } from "~/utils/auth.server";
import type { Route } from "./+types/author";
import { findLinksByAuthor } from "~/utils/links.server";
import Layout from "~/components/nav/Layout";
import { db } from "~/drizzle/db.server";
import { eq } from "drizzle-orm";
import { user } from "~/drizzle/schema.server";
import { invariantResponse } from "@epic-web/invariant";
import LinkPostRep from "~/components/linkPosts/LinkPostRep";
import { useLayout } from "../resources/layout-switch";
import PageHeading from "~/components/nav/PageHeading";
import { Box, Separator } from "@radix-ui/themes";

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
	const layout = useLayout();

	return (
		<Layout>
			<PageHeading title={`Links by ${author}`} />
			<div>
				{links.map((linkPost, index) => (
					<div key={linkPost.link?.id}>
						<LinkPostRep
							linkPost={linkPost}
							instance={instance}
							bsky={bsky}
							layout={layout}
							bookmarks={bookmarks}
							subscribed={subscribed}
						/>
						{index < links.length - 1 &&
							(layout === "default" ? (
								<Separator my="7" size="4" orientation="horizontal" />
							) : (
								<Box my="5" />
							))}
					</div>
				))}
			</div>
		</Layout>
	);
};

export default LinksByAuthor;