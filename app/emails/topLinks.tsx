import type { MostRecentLinkPosts } from "~/utils/links.server";
import EmailLayout from "~/components/emails/Layout";
import EmailHeading from "~/components/emails/Heading";
import LinkPost from "~/components/emails/LinkPost";
import { Hr } from "@react-email/components";

interface TopLinksProps {
	links: [string, MostRecentLinkPosts[]][];
}

const TopLinks = ({ links }: TopLinksProps) => {
	const today = new Intl.DateTimeFormat("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(new Date());

	return (
		<EmailLayout preview="The top links from across your network">
			<EmailHeading>Your Top Links for {today}</EmailHeading>
			{links.map(([link, linkPosts], i) => (
				<>
					<LinkPost key={link} linkPosts={linkPosts} />
					{i < links.length - 1 && <Hr style={hr} />}
				</>
			))}
		</EmailLayout>
	);
};

const hr = {
	margin: "40px 0",
};

export default TopLinks;
