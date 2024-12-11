import type { MostRecentLinkPosts } from "./links.server";

export const subject = "Your Sill Daily Digest";
export const preview = (linkPosts: MostRecentLinkPosts[]) => {
	const hosts = linkPosts
		.map((linkPost) => new URL(linkPost.link?.url || "").hostname)
		.slice(0, 3);

	const hostString = hosts.join(", ");
	return `Today's top links from ${hostString}`;
};

export const title = "Your Sill Daily Digest";

export const intro = (name: string | null) =>
	`Hello${name ? ` ${name}` : ""}, here are your top links from the past 24 hours across your social networks.`;

export const outro = () => (
	<>
		{" "}
		Feedback? Email <a href="mailto:tyler@sill.social">tyler@sill.social</a>.
		Want to stop getting these emails? Adjust your email settings{" "}
		<a href="https://sill.social/email">here</a>.
	</>
);

export const linkPlug = (digestUrl: string) => (
	<>
		View all of these links and the posts that shared them on{" "}
		<a href={digestUrl}>Sill</a>.
	</>
);

export const firstFeedItem = (name: string | null) =>
	`Welcome to Sill's Daily Digest${name ? `, ${name}` : ""}! We'll send your first Daily Digest at your scheduled time.`;
