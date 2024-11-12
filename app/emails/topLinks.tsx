import { Button, Hr, Link, Text } from "@react-email/components";
import EmailHeading from "~/components/emails/Heading";
import EmailLayout from "~/components/emails/Layout";
import LinkPost from "~/components/emails/LinkPost";
import type { MostRecentLinkPosts } from "~/utils/links.server";

interface TopLinksProps {
	links: MostRecentLinkPosts[];
	name: string | null;
}

const TopLinks = ({ links, name }: TopLinksProps) => {
	const today = new Intl.DateTimeFormat("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(new Date());

	return (
		<EmailLayout preview="The top links from across your network">
			<EmailHeading>Your Top Links for {today}</EmailHeading>
			<Text style={lede}>
				Hello{name ? ` ${name}` : ""}, here are your top ten links from the past
				24 hours across your social networks.
			</Text>
			{links.map((linkPost, i) => (
				<>
					<LinkPost key={linkPost.link?.url} linkPost={linkPost} />
					{i < links.length - 1 && <Hr style={hr} />}
				</>
			))}
			<Button href="https://sill.social/links" style={button}>
				See all links on Sill
			</Button>
			<Text>
				Feedback? Email{" "}
				<Link href="mailto:tyler@sill.social">tyler@sill.social</Link>. Want to
				stop getting these emails? Adjust your email settings{" "}
				<Link href="https://sill.social/email">here</Link>.
			</Text>
		</EmailLayout>
	);
};

const hr = {
	margin: "40px 0",
	border: "none",
	borderTop: "1px solid #D9D9E0",
};

const button = {
	margin: "40px 0",
	borderRadius: "0.5em",
	padding: "12px 24px",
	backgroundColor: "#9E6C00",
	color: "#FFFFFF",
	display: "block",
};

const lede = {
	fontSize: "18px",
	marginBottom: "20px",
};

export default TopLinks;
