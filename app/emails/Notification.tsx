import { Button, Heading, Hr, Text } from "@react-email/components";
import EmailLayout from "~/components/emails/Layout";
import LinkPost from "~/components/emails/LinkPost";
import PlusTrial from "~/components/emails/PlusTrial";
import type { SubscriptionStatus } from "~/utils/auth.server";
import { notificationOutro } from "~/utils/digestText";
import type { MostRecentLinkPosts } from "~/utils/links.server";

interface NotificationProps {
	links: MostRecentLinkPosts[];
	groupName: string;
	subscribed: SubscriptionStatus;
}

const Notification = ({ links, groupName, subscribed }: NotificationProps) => {
	const firstLink = links[0].link;
	if (!firstLink) return null;
	const host = new URL(firstLink.url).host;

	return (
		<EmailLayout
			preview={links[0].link?.description || `New link from ${host}`}
		>
			<Heading as="h1">New links found for {groupName}</Heading>
			{subscribed === "trial" && <PlusTrial type="notifications" />}
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
