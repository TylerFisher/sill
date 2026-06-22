import * as Collapsible from "@radix-ui/react-collapsible";
import { Box, Card, Flex, Spinner } from "@radix-ui/themes";
import type { MostRecentLinkPosts, bookmark } from "@sill/schema";
import type { SubscriptionStatus } from "@sill/schema";
import groupBy from "object.groupby";
import { useEffect, useRef, useState } from "react";
import { useFetcher, useSearchParams } from "react-router";
import LinkRep from "~/components/linkPosts/LinkRep";
import PostRep from "~/components/linkPosts/PostRep";
import { ROLLUP_COLLECTIONS } from "./BookmarkRollup";
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
	if (!linkPost.link) return null;
	// Hydrate by the AppView's original URL (sourceUrl), not the display URL —
	// they differ when a URL was rewritten for display (e.g. a Popfeed work URN
	// shown as a popfeed.social page). Falls back to `url` for everything else.
	const linkUrl = linkPost.link.sourceUrl ?? linkPost.link.url;
	const [open, setOpen] = useState(autoExpand);
	// Posts arrive with the row (DB/list feeds, eager) or are hydrated on demand
	// when the card is expanded (AppView feeds, `requested` guards one load).
	// The parent keys cards by the loader run, so this state remounts fresh on
	// every filter change — a URL shared by two feeds won't keep stale posts.
	const [posts, setPosts] = useState<MostRecentLinkPosts["posts"]>(
		linkPost.posts ?? [],
	);
	const requested = useRef(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const [visible, setVisible] = useState(false);
	const fetcher = useFetcher<{ posts: MostRecentLinkPosts["posts"] }>();
	const [searchParams] = useSearchParams();

	const needsHydration = (posts?.length ?? 0) === 0;

	// Mark the card visible once it scrolls near the viewport, so we can warm its
	// posts in the background ahead of a click. Runs post-mount (after load).
	useEffect(() => {
		const el = containerRef.current;
		if (!el || visible || !needsHydration) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					setVisible(true);
					observer.disconnect();
				}
			},
			{ rootMargin: "300px" },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [visible, needsHydration]);

	// Hydrate posts once, on expand or when prefetched into view.
	useEffect(() => {
		if (!(open || visible) || !needsHydration || requested.current) return;
		requested.current = true;
		const params = new URLSearchParams(searchParams);
		params.set("url", linkUrl);
		fetcher.load(`/resources/link-posts?${params.toString()}`);
	}, [open, visible, needsHydration, fetcher, linkUrl, searchParams]);

	useEffect(() => {
		if (fetcher.data?.posts) setPosts(fetcher.data.posts);
	}, [fetcher.data]);

	// Group by post permalink, except bookmark-style collections (Semble / the
	// community lexicon), which roll up all of a link's bookmarkers into one card
	// keyed by collection so they render as "{A}, {B}, and {C} bookmarked this …".
	const groupedPosts = groupBy(posts ?? [], (l) =>
		ROLLUP_COLLECTIONS.has(l.collection ?? "")
			? `rollup:${l.collection}`
			: l.postUrl,
	);
	// Face pile: avatars provided by the row (AppView) or derived from posts.
	const uniqueActors =
		linkPost.avatars && linkPost.avatars.length > 0
			? linkPost.avatars
			: getUniqueAvatarUrls(posts);
	const isLoading = needsHydration && fetcher.state === "loading";
	const isBookmarked = bookmarks.find(
		(bookmark) => bookmark.linkUrl === linkPost.link?.url,
	);

	return (
		<WrapperComponent layout={layout} key={linkPost.link.url}>
			<div ref={containerRef}>
				<LinkRep
					link={linkPost.link}
					instance={instance}
					bsky={bsky}
					layout={layout}
					isBookmarked={isBookmarked}
					subscribed={subscribed}
				/>
				{linkPost.uniqueActorsCount > 0 && (
					<Box mt="4">
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
									{isLoading && (
										<Flex justify="center" py="4">
											<Spinner size="3" />
										</Flex>
									)}
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
					</Box>
				)}
			</div>
		</WrapperComponent>
	);
};

export default LinkPostRep;
