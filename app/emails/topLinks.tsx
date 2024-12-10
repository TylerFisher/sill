import { Button, Heading, Hr, Text } from "@react-email/components";
import EmailLayout from "~/components/emails/Layout";
import LinkPost from "~/components/emails/LinkPost";
import type { digestLayout } from "~/drizzle/schema.server";
import { intro, linkPlug, outro, preview, title } from "~/utils/digestText";
import type { MostRecentLinkPosts } from "~/utils/links.server";

interface TopLinksProps {
	links: MostRecentLinkPosts[];
	name: string | null;
	digestUrl: string;
	layout: "default" | "dense";
}

const TopLinks = ({ links, name, digestUrl, layout }: TopLinksProps) => {
	const today = new Intl.DateTimeFormat("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(new Date());

	return (
		<EmailLayout preview={preview(links)}>
			<Heading as="h1">{title}</Heading>
			<Heading as="h3" style={date}>
				{today}
			</Heading>
			<Text>{intro(name)}</Text>
			<Text>{linkPlug(digestUrl)}</Text>
			{links.map((linkPost, i) => (
				<>
					<LinkPost
						key={linkPost.link?.url}
						linkPost={linkPost}
						digestUrl={digestUrl}
						layout={layout}
					/>
					{i < links.length - 1 && <Hr style={hr(layout)} />}
				</>
			))}
			<Button href="https://sill.social/links" style={button}>
				See all links on Sill
			</Button>
			<Text>{outro()}</Text>
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

export default TopLinks;
