import { invariantResponse } from "@epic-web/invariant";
import LinksList from "~/components/linkPosts/LinksList";
import Layout from "~/components/nav/Layout";
import PageHeading from "~/components/nav/PageHeading";
import { findLinksByTopic } from "~/utils/links.server";
import type { Route } from "./+types/topic";
import { requireUserFromContext } from "~/utils/context.server";

export const loader = async ({ params, context }: Route.LoaderArgs) => {
	const existingUser = await requireUserFromContext(context);
	const subscribed = existingUser.subscriptionStatus;

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
