import React from "react";
import type { MostRecentLinkPosts } from "@sill/schema";

export const subject = "Your Sill Daily Digest";
export const preview = (linkPosts: MostRecentLinkPosts[]) => {
	if (linkPosts.length === 0) {
		return "Sill is having trouble syncing with your Bluesky and/or Mastodon accounts";
	}
	const hosts = linkPosts
		.map((linkPost) => new URL(linkPost.link?.url || "").hostname)
		.slice(0, 3);

	const hostString = hosts.join(", ");
	return `Today's top links from ${hostString}`;
};

export const title = "Your Sill Daily Digest";

export const intro = (name: string | null) =>
	`Hello${name ? ` ${name}` : ""}, here are your top links from the past 24 hours across your social networks.`;

export const digestOutro = (settingsUrl: string) => (
	<>
		{" "}
		Feedback? Email{" "}
		<a
			href="mailto:tyler@sill.social"
			style={{
				color: "#9E6C00",
				textDecoration: "none",
			}}
		>
			tyler@sill.social
		</a>
		. Want to stop getting the Daily Digest? Adjust your digest settings{" "}
		<a
			href={settingsUrl}
			style={{
				color: "#9E6C00",
				textDecoration: "none",
			}}
		>
			here
		</a>
		.
	</>
);

export const notificationOutro = (settingsUrl: string) => (
	<>
		{" "}
		Feedback? Email{" "}
		<a
			href="mailto:tyler@sill.social"
			style={{
				color: "#9E6C00",
				textDecoration: "none",
			}}
		>
			tyler@sill.social
		</a>
		. Want to stop getting these notifications? Adjust your notification
		settings{" "}
		<a
			href={settingsUrl}
			style={{
				color: "#9E6C00",
				textDecoration: "none",
			}}
		>
			here
		</a>
		.
	</>
);

export const linkPlug = (digestUrl: string) => (
	<>
		View all of these links and the posts that shared them on{" "}
		<a
			href={digestUrl}
			style={{
				color: "#9E6C00",
				textDecoration: "none",
			}}
		>
			Sill
		</a>
		.
	</>
);

export const firstFeedItem = (name: string | null) =>
	`Welcome to Sill's Daily Digest${name ? `, ${name}` : ""}! We'll send your first Daily Digest at your scheduled time.`;
