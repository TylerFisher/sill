import groupBy from "object.groupby";
import type { MostRecentLinkPosts, SubscriptionStatus } from "@sill/schema";
import { notificationOutro } from "../utils/digestText.js";
import { truncateDescription } from "../utils/misc.js";
import { isReviewCard, workTypeYearLine } from "../utils/popfeed.js";
import RSSPost from "./RSSPost.js";

const RSSNotificationItem = ({
	linkPost,
	subscribed,
}: { linkPost: MostRecentLinkPosts; subscribed: SubscriptionStatus }) => {
	if (!linkPost.link || !linkPost.posts) return null;
	const link = linkPost.link;
	const groupedPosts = groupBy(linkPost.posts, (l) => l.postUrl);
	const host = new URL(link.url).host;
	const credit = link.authors?.filter(Boolean).join(", ") || null;
	const typeYear = workTypeYearLine(link.workType, link.publishedDate);

	return (
		<div key={link.url}>
			{isReviewCard(link) ? (
				<table>
					<tbody>
						<tr>
							{link.imageUrl && (
								<td style={{ width: "100px", verticalAlign: "top" }}>
									<a href={link.url}>
										<img
											src={link.imageUrl}
											alt=""
											style={{ width: "100px", display: "block" }}
										/>
									</a>
								</td>
							)}
							<td style={{ verticalAlign: "top", paddingLeft: "12px" }}>
								{credit && (
									<p style={{ margin: 0, fontSize: "12px", color: "#999" }}>
										{credit}
									</p>
								)}
								<h3 style={{ margin: "2px 0" }}>
									<a href={link.url}>{link.title || link.url}</a>
								</h3>
								{typeYear && (
									<p style={{ margin: 0, fontSize: "12px", color: "#999" }}>
										{typeYear}
									</p>
								)}
							</td>
						</tr>
					</tbody>
				</table>
			) : (
				<>
					{link.imageUrl && <img src={link.imageUrl} alt={link.title} />}
					<p>
						<small>
							<a href={link.url}>{host}</a>
							{link.giftUrl ? (
								<>
									{" "}
									<a href={link.giftUrl}>(gift link)</a>
								</>
							) : null}
						</small>
					</p>
					{link.description && (
						<p>{truncateDescription(link.description)}</p>
					)}
				</>
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
