import React from "react";
import {
	Column,
	Heading,
	Img,
	Link,
	Row,
	Section,
	Text,
} from "@react-email/components";
import groupBy from "object.groupby";
import type { MostRecentLinkPosts } from "@sill/schema";
import Post from "./Post.js";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

interface LinkPostProps {
	linkPost: MostRecentLinkPosts;
	digestUrl?: string;
	layout: "default" | "dense";
}

function normalizeActorName(name: string | null): string | null {
	if (!name) return null;
	return name.toLowerCase().replace(/\s*\(.*?\)\s*/g, "");
}

function normalizeActorHandle(
	postType: "mastodon" | "bluesky" | "atbookmark",
	handle: string | null,
): string | null {
	if (!handle) return null;

	if (postType === "mastodon") {
		const match = handle.match(/^@?([^@]+)(?:@|$)/);
		return match ? match[1].toLowerCase() : null;
	}
	return handle.replace(".bsky.social", "").replace("@", "").toLowerCase();
}

export function getUniqueAvatarUrls(
	posts: MostRecentLinkPosts["posts"],
): string[] {
	const actorMap = new Map<string, { avatarUrl: string }>();
	if (!posts) return [];
	for (const post of posts) {
		// If there's a repost actor, use that; otherwise use the original actor
		const actor = post.repostActorHandle
			? {
					name: post.repostActorName,
					handle: post.repostActorHandle,
					avatarUrl: post.repostActorAvatarUrl,
				}
			: {
					name: post.actorName,
					handle: post.actorHandle,
					avatarUrl: post.actorAvatarUrl,
				};

		const normalizedName = normalizeActorName(actor.name);
		const normalizedHandle = normalizeActorHandle(post.postType, actor.handle);
		const identifier = `${normalizedName}|${normalizedHandle}`;

		if (identifier && actor.avatarUrl) {
			const existing = Array.from(actorMap.keys()).find(
				(key) =>
					key.split("|")[0] === normalizedName ||
					key.split("|")[1] === normalizedHandle,
			);
			if (!existing) {
				actorMap.set(identifier, {
					avatarUrl: actor.avatarUrl,
				});
			}
		}
	}

	return Array.from(actorMap.values())
		.map((entry) => entry.avatarUrl)
		.filter((url): url is string => url != null);
}

const LinkPost = ({ linkPost, digestUrl, layout }: LinkPostProps) => {
	if (!linkPost.link || !linkPost.posts) return null;
	const link = linkPost.link;
	const uniqueActors = getUniqueAvatarUrls(linkPost.posts);
	const groupedPosts = groupBy(linkPost.posts, (l) => l.postUrl);

	return (
		<div style={container}>
			<Link href={link.url}>
				<Section style={wrapper}>
					{link.imageUrl && layout === "default" && (
						<Row>
							<Column style={imgWrapper}>
								<Img src={link.imageUrl} style={img} />
							</Column>
						</Row>
					)}
					<Row style={row}>
						<Column>
							<Text style={host}>
								{new URL(link.url).host}{" "}
								{link.giftUrl && (
									<Link style={giftLink} href={link.giftUrl}>
										(gift link)
									</Link>
								)}
							</Text>
							<Heading style={heading} as="h2">
								{link.title || link.url}
							</Heading>
							<Text style={text}>{link.description}</Text>
							{(link.authors || link.publishedDate) && (
								<Text style={metadata}>
									{link.authors && (
										<span>
											by{" "}
											{link.authors.length === 2 ? (
												link.authors.map((author, index) => (
													<span key={author}>
														{author}
														{index === 0 && " and "}
													</span>
												))
											) : link.authors.length > 2 ? (
												link.authors.map((author, index) => (
													<span key={author}>
														{author}
														{index < link.authors!.length - 1 &&
															(index === link.authors!.length - 2
																? " and "
																: ", ")}
													</span>
												))
											) : (
												<span>{link.authors[0]}</span>
											)}
										</span>
									)}
									{link.authors && link.publishedDate && <span> • </span>}
									{link.publishedDate && (
										<span>
											{timeAgo.format(
												new Date(link.publishedDate),
												"round-minute",
											)}
										</span>
									)}
								</Text>
							)}
						</Column>
					</Row>
				</Section>
			</Link>
			{digestUrl ? (
				<>
					{uniqueActors.slice(0, 3).map((actor, i) => (
						<Img
							src={actor}
							loading="lazy"
							decoding="async"
							key={actor}
							style={avatar(i)}
						/>
					))}
					<Text style={accounts}>
						<Link style={postsLink} href={`${digestUrl}#${link.id}`}>
							Shared by {uniqueActors.length}{" "}
							{uniqueActors.length === 1 ? "account" : "accounts"}
						</Link>
					</Text>
				</>
			) : (
				<>
					<Heading style={accountsHeading} as="h3">
						Shared by {uniqueActors.length}{" "}
						{uniqueActors.length === 1 ? "account" : "accounts"}
					</Heading>
					{Object.entries(groupedPosts).map(([postUrl, group]) => (
						<Post key={postUrl} group={group} />
					))}
				</>
			)}
		</div>
	);
};

const container = {
	maxWidth: "500px",
	margin: "0 auto",
};

const wrapper = {
	maxWidth: "100%",
	margin: "0 0 20px 0",
	borderRadius: "12px",
	border: "#D9D9E0 1px solid",
};

const row = {
	padding: "12px",
};

const imgWrapper = {
	width: "100%",
	padding: 0,
	margin: 0,
	borderCollapse: "collapse" as const,
	maxWidth: "500px",
};

const img = {
	width: "100%",
	display: "block",
	height: "56.25vw", // 16:9 ratio of viewport width
	maxHeight: "281px", // 600px * 0.5625
	minHeight: "168px", // For very small screens
	borderTopLeftRadius: "12px",
	borderTopRightRadius: "12px",
	objectFit: "cover" as const,
};

const host = {
	margin: 0,
	color: "gray",
	fontSize: "12px",
	lineHeight: 1,
};

const giftLink = {
	margin: 0,
	color: "gray",
	fontSize: "12px",
	lineHeight: 1,
	textDecoration: "underline",
};

const heading = {
	color: "#9E6C00",
	lineHeight: 1.2,
	marginTop: "0.33em",
	marginBottom: "0.33em",
	wordBreak: "break-all" as const,
};

const text = {
	color: "black",
	marginTop: "0.33em",
};

const avatar = (i: number) => ({
	margin: i > 0 ? "0 0 0 -12px" : 0,
	borderRadius: "100%",
	display: "inline-block",
	width: "24px",
	height: "24px",
});

const accounts = {
	display: "inline",
	verticalAlign: "top",
	margin: "0 0 0 12px",
};

const accountsHeading = {};

const postsLink = {
	color: "#9E6C00",
};

const metadata = {
	margin: "0.33em 0 0 0",
	color: "gray",
	fontSize: "12px",
	lineHeight: 1,
};

export default LinkPost;
