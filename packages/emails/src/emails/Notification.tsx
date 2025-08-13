import React from "react"
import { Button, Heading, Hr, Text } from "@react-email/components";
import EmailLayout from "../components/Layout.js";
import LinkPost from "../components/LinkPost.js";
import PlusTrial from "../components/PlusTrial.js";
import type { SubscriptionStatus, MostRecentLinkPosts } from "@sill/schema";
import { notificationOutro } from "../utils/digestText.js";

interface NotificationProps {
	links: MostRecentLinkPosts[];
	groupName: string;
	subscribed: SubscriptionStatus;
	freeTrialEnd: Date | null;
}

const Notification = ({
	links,
	groupName,
	subscribed,
	freeTrialEnd,
}: NotificationProps) => {
	const firstLink = links[0].link;
	if (!firstLink) return null;
	const host = new URL(firstLink.url).host;

	return (
		<EmailLayout
			preview={links[0].link?.description || `New link from ${host}`}
		>
			<Heading as="h1">New links found for {groupName}</Heading>
			{subscribed === "trial" && freeTrialEnd && (
				<PlusTrial type="notifications" endDate={freeTrialEnd} />
			)}
			{links.map((linkPost, i) => (
				<>
					<LinkPost
						key={linkPost.link?.url}
						linkPost={linkPost}
						layout={"default"}
					/>
					{i < links.length - 1 && <Hr style={hr("default")} />}
				</>
			))}
			<Button href="https://sill.social/links" style={button}>
				See all links on Sill
			</Button>
			<Text>{notificationOutro("https://sill.social/notifications")}</Text>
		</EmailLayout>
	);
};

const hr = (layout: "default" | "dense") => ({
	margin: layout === "default" ? "40px 0" : "30px 0",
	border: "none",
	borderTop: "1px solid #D9D9E0",
});

const button = {
	margin: "40px 0",
	borderRadius: "0.5em",
	padding: "12px 24px",
	backgroundColor: "#9E6C00",
	color: "#FFFFFF",
	display: "block",
};

const date = {
	fontSize: "18px",
	marginBottom: "20px",
};

export default Notification;
