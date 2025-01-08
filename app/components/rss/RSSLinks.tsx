import { Heading, Text, Link } from "@radix-ui/themes";
import type { MostRecentLinkPosts } from "~/utils/links.server";
import RSSLinkPost from "./RSSLinkPost";
import { digestOutro, intro, linkPlug } from "~/utils/digestText";

interface RSSLinksProps {
	links: MostRecentLinkPosts[];
	name: string | null;
	digestUrl: string;
}

const RSSLinks = ({ links, name, digestUrl }: RSSLinksProps) => {
	const today = new Intl.DateTimeFormat("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(new Date());

	return (
		<article>
			<Heading as="h1">{today}</Heading>
			<Text as="p">{intro(name)}</Text>
			<Text as="p">{linkPlug(digestUrl)}</Text>
			<Text as="p">
				<hr />
			</Text>
			{links.map((linkPost, i) => (
				<RSSLinkPost
					key={linkPost.link?.url}
					linkPost={linkPost}
					digestUrl={digestUrl}
				/>
			))}
			<Text as="p">
				<Link href="https://sill.social/links">See all links on Sill</Link>
			</Text>
			<Text as="p">{digestOutro("https://sill.social/email")}</Text>
		</article>
	);
};

export default RSSLinks;
