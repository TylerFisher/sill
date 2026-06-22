import { Box, Link, Text } from "@radix-ui/themes";
import groupBy from "object.groupby";
import type { MostRecentLinkPosts, SubscriptionStatus } from "@sill/schema";
import { notificationOutro } from "~/utils/digestText";
import { isReviewCard } from "~/utils/popfeed";
import RSSPopfeedHeader from "./RSSPopfeedHeader";
import RSSPost from "./RSSPost";

const RSSNotificationItem = ({
	linkPost,
	subscribed,
}: { linkPost: MostRecentLinkPosts; subscribed: SubscriptionStatus }) => {
	if (!linkPost.link || !linkPost.posts) return null;
	const link = linkPost.link;
	const groupedPosts = groupBy(linkPost.posts, (l) => l.postUrl);
	const host = new URL(link.url).host;

	return (
		<Box key={link.url}>
			{isReviewCard(link) ? (
				<RSSPopfeedHeader link={link} />
			) : (
				<>
					{link.imageUrl && <img src={link.imageUrl} alt={link.title} />}
					<Text as="p">
						<small>
							<Link href={link.url}>{host}</Link>
							{link.giftUrl ? (
								<>
									{" "}
									<Link href={link.giftUrl}>(gift link)</Link>
								</>
							) : null}
						</small>
					</Text>
					<Text as="p">{link.description}</Text>
				</>
			)}
			{subscribed === "trial" && (
				<Text as="p">
					You are on a free trial of Sill+.{" "}
					<Link href="https://sill.social/settings/subscription">
						Subscribe now
					</Link>{" "}
					to maintain access.
				</Text>
			)}
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
