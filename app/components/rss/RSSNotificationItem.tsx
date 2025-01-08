import { Box, Link, Text } from "@radix-ui/themes";
import groupBy from "object.groupby";
import type { MostRecentLinkPosts } from "~/utils/links.server";
import RSSPost from "./RSSPost";
import { notificationOutro } from "~/utils/digestText";

const RSSNotificationItem = ({
	linkPost,
}: { linkPost: MostRecentLinkPosts }) => {
	if (!linkPost.link || !linkPost.posts) return null;
	const groupedPosts = groupBy(linkPost.posts, (l) => l.postUrl);
	const host = new URL(linkPost.link.url).host;

	return (
		<Box key={linkPost.link.url}>
			{linkPost.link.imageUrl && (
				<img src={linkPost.link.imageUrl} alt={linkPost.link.title} />
			)}
			<Text as="p">
				<small>
					<Link href={linkPost.link.url}>{host}</Link>
					{linkPost.link.giftUrl ? (
						<>
							{" "}
							<Link href={linkPost.link.giftUrl}>(gift link)</Link>
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
			{Object.entries(groupedPosts).map(([postUrl, group], index) => (
				<Box key={postUrl}>
					<RSSPost postUrl={postUrl} group={group} />
					<hr />
				</Box>
			))}
			<Text as="p">
				{notificationOutro("https://sill.social/notifications")}
			</Text>
		</Box>
	);
};

export default RSSNotificationItem;
