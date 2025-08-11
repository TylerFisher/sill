import { Button, Heading, Hr, Link, Text } from "@react-email/components";
import type { MostRecentLinkPosts } from "@sill/schema";
import EmailLayout from "../components/Layout";

interface TopLinksEmailProps {
	links: MostRecentLinkPosts[];
	name: string | null;
	digestUrl: string;
	layout: "default" | "dense";
	subscribed: string;
	freeTrialEnd: Date | null;
}

const preview = (linkPosts: MostRecentLinkPosts[]) => {
	if (linkPosts.length === 0) {
		return "Sill is having trouble syncing with your Bluesky and/or Mastodon accounts";
	}
	const hosts = linkPosts
		.map((linkPost) => new URL(linkPost.link?.url || "").hostname)
		.slice(0, 3);

	const hostString = hosts.join(", ");
	return `Today's top links from ${hostString}`;
};

const intro = (name: string | null) =>
	`Hello${name ? ` ${name}` : ""}, here are your top links from the past 24 hours across your social networks.`;

const TopLinksEmail = ({
	links,
	name,
	digestUrl,
	layout,
	subscribed,
	freeTrialEnd,
}: TopLinksEmailProps) => {
	const today = new Intl.DateTimeFormat("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
		timeZone: "America/New_York",
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
						<Link href="https://sill.social/settings?tab=connect">
							go to your connection settings
						</Link>{" "}
						and re-connect your accounts.
					</Text>
					<Hr />
					<Text>
						View all of these links and the posts that shared them on{" "}
						<Link href={digestUrl}>Sill</Link>.
					</Text>
				</>
			) : (
				<>
					<Heading as="h1">Your Sill Daily Digest</Heading>
					<Text style={{ fontSize: 16, lineHeight: 1.4, margin: "16px 0" }}>
						{intro(name)}
					</Text>
					<Text style={{ fontSize: 14, color: "#666", margin: "8px 0" }}>
						{today}
					</Text>

					{/* Simple layout for links */}
					{links.slice(0, 10).map((linkPost, index) => (
						<div
							key={linkPost.link?.id}
							style={{
								marginBottom: "24px",
								borderBottom: "1px solid #eee",
								paddingBottom: "16px",
							}}
						>
							{linkPost.link?.title && (
								<Heading as="h2" style={{ fontSize: 18, margin: "0 0 8px 0" }}>
									<Link href={linkPost.link.url || "#"}>
										{linkPost.link.title}
									</Link>
								</Heading>
							)}
							{linkPost.link?.description && (
								<Text
									style={{ fontSize: 14, color: "#666", margin: "0 0 12px 0" }}
								>
									{linkPost.link.description}
								</Text>
							)}
							<Text style={{ fontSize: 12, color: "#999" }}>
								Shared by {linkPost.posts?.length}{" "}
								{linkPost.posts?.length === 1 ? "person" : "people"}
							</Text>
						</div>
					))}

					<Hr />
					<Text>
						<Button
							href={digestUrl}
							style={{
								backgroundColor: "#9E6C00",
								color: "white",
								padding: "12px 24px",
								textDecoration: "none",
								borderRadius: "4px",
							}}
						>
							View on Sill
						</Button>
					</Text>
					<Text style={{ fontSize: 12, color: "#666", marginTop: "24px" }}>
						Feedback? Email tyler@sill.social. Want to stop getting the Daily
						Digest?{" "}
						<Link href="https://sill.social/settings">
							Adjust your digest settings
						</Link>
						.
					</Text>
				</>
			)}
		</EmailLayout>
	);
};

export default TopLinksEmail;
