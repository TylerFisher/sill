import { Avatar, Box, Card, Flex, Inset, Separator } from "@radix-ui/themes";
import PostAuthor from "~/components/linkPosts/PostAuthor";
import PostContent from "~/components/linkPosts/PostContent";
import RepostActor from "~/components/linkPosts/RepostActor";
import type { linkPostDenormalized } from "@sill/schema";
import { useTheme } from "~/routes/resources/theme-switch";
import Toolbar from "./Toolbar";
interface PostRepProps {
	group: (typeof linkPostDenormalized.$inferSelect)[];
	instance: string | undefined;
	bsky: string | undefined;
	toolbar?: boolean;
	layout: "default" | "dense";
}

type Post = typeof linkPostDenormalized.$inferSelect;

/**
 * The little source logo in the card corner. Bluesky/Mastodon posts go by
 * `postType`; everything else arrives as "atbookmark" and is distinguished by
 * a marker class the mapper embeds in `postText` (or, for Semble, the post
 * host). First match wins, so order is by specificity.
 */
const resolveSourceLogo = (post: Post): string | null => {
	if (post.postType === "bluesky") return "/bluesky-logo.svg";
	if (post.postType === "mastodon") return "/mastodon-logo.svg";

	const bodyMarkers: { marker: string; logo: string }[] = [
		{ marker: "scrobble-card", logo: "/rocksky.png" },
		{ marker: "offprint-source", logo: "/offprint.svg" },
		{ marker: "pckt-source", logo: "/pckt.svg" },
		{ marker: "sill-bookmark", logo: "/sill.svg" },
		{ marker: "leaflet-source", logo: "/leaflet.svg" },
	];
	for (const { marker, logo } of bodyMarkers) {
		if (post.postText?.includes(marker)) return logo;
	}

	if (post.postUrl?.includes("semble.so")) return "/semble-logo.svg";
	if (post.postUrl?.includes("leaflet.pub")) return "/leaflet.svg";

	return null;
};

const PostRep = ({
	group,
	instance,
	bsky,
	toolbar = true,
	layout = "default",
}: PostRepProps) => {
	const theme = useTheme();
	const post = group[0];
	const reposters = group
		.filter((l) => l.repostActorHandle !== l.actorHandle && l.repostActorHandle)
		.filter((l) => l !== undefined);

	const sourceLogo = resolveSourceLogo(post);

	return (
		<Card key={post.postUrl} mt="5" size="1">
			<Box mb="5">
				<Flex
					gap={{
						initial: "2",
						sm: "3",
					}}
					align="start"
					mb="1"
					mr="5"
				>
					<a
						href={post.actorUrl}
						target="_blank"
						rel="noreferrer"
						aria-label={`Link to ${post.actorName}'s profile page`}
					>
						<Avatar
							size={{
								initial: layout === "dense" ? "1" : "2",
								sm: layout === "dense" ? "2" : "3",
							}}
							src={post.actorAvatarUrl || undefined}
							radius="full"
							fallback={post.actorHandle[0]}
							mt={reposters.length > 0 ? "4" : "1"}
							loading="lazy"
							decoding="async"
						/>
					</a>
					<Box>
						{reposters.length > 0 && <RepostActor posts={reposters} />}
						<PostAuthor
							actor={{
								actorUrl: post.actorUrl,
								actorName: post.actorName,
								actorHandle: post.actorHandle,
								actorAvatarUrl: post.actorAvatarUrl,
							}}
							postUrl={post.postUrl}
							postDate={post.postDate}
							layout={layout}
						/>
						<PostContent
							post={{
								postText: post.postText,
								postType: post.postType,
								postImages: post.postImages,
							}}
							layout={layout}
						/>
					</Box>
				</Flex>
				{post.quotedPostUrl &&
					post.quotedActorHandle &&
					post.quotedPostDate && (
						<Card
							ml={{
								initial: "6",
								sm: "8",
							}}
							mt="2"
							size="1"
						>
							<Flex gap="1" mb="1" align="center">
								<a
									href={post.quotedActorUrl || ""}
									target="_blank"
									rel="noreferrer"
									aria-label={`Link to ${post.quotedActorName}'s profile page`}
								>
									<Avatar
										src={post.quotedActorAvatarUrl || undefined}
										radius="full"
										fallback={post.quotedActorHandle[0]}
										style={{
											width: "20px",
											height: "20px",
											verticalAlign: "text-bottom",
										}}
									/>
								</a>
								<PostAuthor
									actor={{
										actorUrl: post.quotedActorUrl || "",
										actorName: post.quotedActorName,
										actorHandle: post.quotedActorHandle,
										actorAvatarUrl: post.quotedActorAvatarUrl,
									}}
									postUrl={post.quotedPostUrl}
									postDate={post.quotedPostDate}
									layout={layout}
								/>
							</Flex>
							<PostContent
								post={{
									postText: post.quotedPostText || "",
									postType: post.quotedPostType || "bluesky",
									postImages: post.quotedPostImages,
								}}
								layout={layout}
							/>
						</Card>
					)}
			</Box>

			{toolbar && (
				<Inset
					mt="4"
					style={{
						borderRadius: 0,
					}}
				>
					<Box
						py="2"
						style={{
							backgroundColor:
								theme === "dark" ? "var(--gray-3)" : "var(--gray-2)",
							borderRadius: "0",
						}}
						px="4"
					>
						<Toolbar
							url={post.postUrl}
							narrowMutePhrase={post.postUrl}
							broadMutePhrase={post.actorHandle}
							type="post"
							instance={instance}
							bsky={bsky}
							isBookmarked={false}
							layout={layout}
						/>
					</Box>
				</Inset>
			)}

			{sourceLogo && (
				<img
					src={sourceLogo}
					alt=""
					width="24"
					height="auto"
					style={{
						display: "inline",
						position: "absolute",
						top: "10px",
						right: "10px",
						opacity: "0.3",
					}}
				/>
			)}
		</Card>
	);
};

export default PostRep;
