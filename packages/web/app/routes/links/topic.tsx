import { invariantResponse } from "@epic-web/invariant";
import { eq } from "drizzle-orm";
import LinksList from "~/components/linkPosts/LinksList";
import Layout from "~/components/nav/Layout";
import PageHeading from "~/components/nav/PageHeading";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import { isSubscribed, requireUserId } from "~/utils/auth.server";
import { findLinksByTopic } from "~/utils/links.server";
import type { Route } from "./+types/topic";

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

	const topic = params.topic;

	const links = await findLinksByTopic(topic);

	return {
		links,
		instance: existingUser.mastodonAccounts[0].mastodonInstance.instance,
		bsky: existingUser.blueskyAccounts[0].handle,
		bookmarks: existingUser.bookmarks,
		subscribed,
		topic,
	};
};

const LinksByTopic = ({ loaderData }: Route.ComponentProps) => {
	const { links, instance, bsky, bookmarks, subscribed, topic } = loaderData;

	return (
		<Layout>
			<PageHeading title={`Links about ${topic}`} />
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

export default LinksByTopic;
