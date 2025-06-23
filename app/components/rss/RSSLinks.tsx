import { Heading, Text, Link } from "@radix-ui/themes";
import type { MostRecentLinkPosts } from "~/utils/links.server";
import RSSLinkPost from "./RSSLinkPost";
import { digestOutro, intro, linkPlug } from "~/utils/digestText";
import type { SubscriptionStatus } from "~/utils/auth.server";

interface RSSLinksProps {
	links: MostRecentLinkPosts[];
	name: string | null;
	digestUrl: string;
	subscribed: SubscriptionStatus;
}

const RSSLinks = ({ links, name, digestUrl, subscribed }: RSSLinksProps) => {
	const today = new Intl.DateTimeFormat("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(new Date());

	return (
		<article>
			{links.length === 0 ? (
				<>
					<Heading as="h1">Oops, no links!</Heading>
					<Text as="p">
						It looks like Sill doesn't have any links for you. This is likely
						because Sill got out of sync with your Bluesky and/or Mastodon
						accounts. To address this,{" "}
						<Link href="https://sill.social/settings?tab=connect">
							log back into Sill
						</Link>
						. You may be redirected to Bluesky or Mastodon to reauthorize Sill.
					</Text>
					<Text as="p">
						If this doesn't work for you, please email{" "}
						<Link href="mailto:tyler@sill.social">tyler@sill.social</Link>.
					</Text>
				</>
			) : (
				<>
					<Heading as="h1">{today}</Heading>
					<Text as="p">{intro(name)}</Text>
					{subscribed === "trial" && (
						<Text as="p">
							You are on a free trial of Sill+.{" "}
							<Link href="https://sill.social/settings/subscription">
								Subscribe now
							</Link>{" "}
							to maintain access.
						</Text>
					)}
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
				</>
			)}

			<Text as="p">{digestOutro("https://sill.social/digest/settings")}</Text>
		</article>
	);
};

export default RSSLinks;
