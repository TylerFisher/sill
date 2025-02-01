import { Button, Heading, Hr, Link, Text } from "@react-email/components";
import EmailLayout from "~/components/emails/Layout";
import LinkPost from "~/components/emails/LinkPost";
import PlusTrial from "~/components/emails/PlusTrial";
import type { SubscriptionStatus } from "~/utils/auth.server";
import {
	digestOutro,
	intro,
	linkPlug,
	preview,
	title,
} from "~/utils/digestText";
import type { MostRecentLinkPosts } from "~/utils/links.server";

interface TopLinksProps {
	links: MostRecentLinkPosts[];
	name: string | null;
	digestUrl: string;
	layout: "default" | "dense";
	subscribed: SubscriptionStatus;
}

const TopLinks = ({
	links,
	name,
	digestUrl,
	layout,
	subscribed,
}: TopLinksProps) => {
	const today = new Intl.DateTimeFormat("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(new Date());

	return (
		<EmailLayout preview={preview(links)}>
			{links.length === 0 ? (
				<>
					<Heading as="h1">Oops, no links!</Heading>
					<Text>
						It looks like Sill doesn't have any links for you. This is likely
						because Sill got out of sync with your Bluesky and/or Mastodon
						accounts. To address this,{" "}
						<Link href={import.meta.env.VITE_PUBLIC_DOMAIN}>
							log back into Sill
						</Link>
						. You may be redirected to Bluesky or Mastodon to reauthorize Sill.
					</Text>
					<Text>
						If this doesn't work for you, please email{" "}
						<Link href={`mailto:${import.meta.env.VITE_ADMIN_EMAIL}`}>
							{import.meta.env.VITE_ADMIN_EMAIL}
						</Link>
						.
					</Text>
				</>
			) : (
				<>
					<Heading as="h1">{title}</Heading>
					<Heading as="h3" style={date}>
						{today}
					</Heading>
					{subscribed === "trial" && <PlusTrial type="Daily Digests" />}
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
					<Button
						href={`${import.meta.env.VITE_PUBLIC_DOMAIN}/links`}
						style={button}
					>
						See all links on Sill
					</Button>
				</>
			)}
			<Text>{digestOutro(`${import.meta.env.VITE_PUBLIC_DOMAIN}/email`)}</Text>
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
