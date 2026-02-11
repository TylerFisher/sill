import groupBy from "object.groupby";
import type { MostRecentLinkPosts, SubscriptionStatus } from "@sill/schema";
import { notificationOutro } from "../utils/digestText.js";
import { truncateDescription } from "../utils/misc.js";
import RSSPost from "./RSSPost.js";

const RSSNotificationItem = ({
	linkPost,
	subscribed,
}: { linkPost: MostRecentLinkPosts; subscribed: SubscriptionStatus }) => {
	if (!linkPost.link || !linkPost.posts) return null;
	const groupedPosts = groupBy(linkPost.posts, (l) => l.postUrl);
	const host = new URL(linkPost.link.url).host;

	return (
		<div key={linkPost.link.url}>
			{linkPost.link.imageUrl && (
				<img src={linkPost.link.imageUrl} alt={linkPost.link.title} />
			)}
			<p>
				<small>
					<a href={linkPost.link.url}>{host}</a>
					{linkPost.link.giftUrl ? (
						<>
							{" "}
							<a href={linkPost.link.giftUrl}>(gift link)</a>
						</>
					) : null}
				</small>
			</p>
			{linkPost.link.description && (
				<p>{truncateDescription(linkPost.link.description)}</p>
			)}
			{subscribed === "trial" && (
				<p>
					You are on a free trial of Sill+.{" "}
					<a href="https://sill.social/settings/subscription">
						Subscribe now
					</a>{" "}
					to maintain access.
				</p>
			)}
			<p>
				Shared by {linkPost.uniqueActorsCount}{" "}
				{linkPost.uniqueActorsCount === 1 ? "account" : "accounts"}
			</p>
			<hr />
			{Object.entries(groupedPosts).map(([postUrl, group]) => (
				<div key={postUrl}>
					<RSSPost postUrl={postUrl} group={group} />
					<hr />
				</div>
			))}
			<p>
				{notificationOutro("https://sill.social/notifications")}
			</p>
		</div>
	);
};

export default RSSNotificationItem;
