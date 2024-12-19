import { Box, Link, Text } from "@radix-ui/themes";
import groupBy from "object.groupby";
import type { MostRecentLinkPosts } from "~/utils/links.server";
import RSSPost from "./RSSPost";

const RSSNotificationItem = ({
	linkPost,
}: { linkPost: MostRecentLinkPosts }) => {
	if (!linkPost.link || !linkPost.posts) return null;
	const groupedPosts = groupBy(linkPost.posts, (l) => l.postUrl);
	const host = new URL(linkPost.link.url).host;

	return (
		<Box key={linkPost.link.url}>
			<Text as="p">
				<small>
					from {host}
					{linkPost.link.giftUrl ? (
						<>
							{" "}
							<Link href={linkPost.link.url}>(link)</Link>
						</>
					) : null}
				</small>
			</Text>
			<Text as="p">{linkPost.link.description}</Text>
			<Text as="p">
				Shared by {linkPost.uniqueActorsCount}{" "}
				{linkPost.uniqueActorsCount === 1 ? "account" : "accounts"}
			</Text>
			<hr />
			{Object.entries(groupedPosts).map(([postUrl, group]) => (
				<Box key={postUrl}>
					<RSSPost postUrl={postUrl} group={group} />
					<hr />
				</Box>
			))}
		</Box>
	);
};

export default RSSNotificationItem;
