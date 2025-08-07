import * as Collapsible from "@radix-ui/react-collapsible";
import { Box, Card } from "@radix-ui/themes";
import groupBy from "object.groupby";
import { useState } from "react";
import LinkRep from "~/components/linkPosts/LinkRep";
import PostRep from "~/components/linkPosts/PostRep";
import type { bookmark } from "~/drizzle/schema.server";
import type { SubscriptionStatus } from "~/utils/auth.server";
import type { MostRecentLinkPosts } from "~/utils/links.server";
import SharedByBug from "./SharedByBug";
export interface LinkPostRepProps {
	linkPost: MostRecentLinkPosts;
	instance: string | undefined;
	bsky: string | undefined;
	layout: "dense" | "default";
	autoExpand?: boolean;
	bookmarks: (typeof bookmark.$inferSelect)[];
	subscribed: SubscriptionStatus;
}

function normalizeActorName(name: string | null): string | null {
	if (!name) return null;
	return name.toLowerCase().replace(/\s*\(.*?\)\s*/g, "");
}

function normalizeActorHandle(
	postType: "mastodon" | "bluesky",
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

interface WrapperComponentProps extends React.PropsWithChildren {
	layout: "default" | "dense";
}

const WrapperComponent = ({ layout, children }: WrapperComponentProps) => {
	if (layout === "dense") {
		return (
			<Card
				style={{
					overflow: "visible", // allow sticky
				}}
			>
				{children}
			</Card>
		);
	}
	return <Box>{children}</Box>;
};

const LinkPostRep = ({
	linkPost,
	instance,
	bsky,
	layout,
	autoExpand = false,
	bookmarks = [],
	subscribed,
}: LinkPostRepProps) => {
	if (!linkPost) return null;
	if (!linkPost.posts || !linkPost.link) return null;
	const [open, setOpen] = useState(autoExpand);
	const groupedPosts = groupBy(linkPost.posts, (l) => l.postUrl);
	const uniqueActors = getUniqueAvatarUrls(linkPost.posts);
	const isBookmarked = bookmarks.some(
		(bookmark) => bookmark.linkUrl === linkPost.link?.url,
	);

	return (
		<WrapperComponent layout={layout} key={linkPost.link.url}>
			<LinkRep
				link={linkPost.link}
				instance={instance}
				bsky={bsky}
				layout={layout}
				isBookmarked={isBookmarked}
				subscribed={subscribed}
			/>
			<Collapsible.Root
				className="CollapsibleRoot"
				open={open}
				onOpenChange={setOpen}
			>
				<SharedByBug
					uniqueActors={uniqueActors}
					uniqueActorsCount={linkPost.uniqueActorsCount}
					open={open}
					layout={layout}
				/>
				<Collapsible.Content>
					<Box mt="5">
						{Object.entries(groupedPosts).map(([postUrl, group]) => (
							<PostRep
								key={postUrl}
								group={group}
								instance={instance}
								bsky={bsky}
								layout={layout}
							/>
						))}
					</Box>
				</Collapsible.Content>
			</Collapsible.Root>
		</WrapperComponent>
	);
};

export default LinkPostRep;
