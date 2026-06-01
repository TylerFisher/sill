import { Avatar, Box, Card, Flex, Inset } from "@radix-ui/themes";
import PostAuthor from "~/components/linkPosts/PostAuthor";
import PostContent from "~/components/linkPosts/PostContent";
import RepostActor from "~/components/linkPosts/RepostActor";
import type { RenderedLinkPost } from "@sill/schema";
import { useTheme } from "~/routes/resources/theme-switch";
import ParentPost from "./ParentPost";
import QuotedPost from "./QuotedPost";
import SourceBadge from "./SourceBadge";
import Toolbar from "./Toolbar";
interface PostRepProps {
	group: RenderedLinkPost[];
	instance: string | undefined;
	bsky: string | undefined;
	toolbar?: boolean;
	layout: "default" | "dense";
}

type Post = RenderedLinkPost;

/**
 * The little source logo in the card corner, keyed off the share's `collection`
 * NSID. `site.standard.document` shares (Leaflet/Offprint/Pckt) carry their
 * content NSID here instead of the shared envelope, so each publisher resolves
 * directly.
 */
const resolveSourceLogo = (post: Post): string | null => {
	switch (post.collection) {
		case "app.bsky.feed.post":
		case "app.bsky.feed.repost":
			return "/bluesky-logo.svg";
		case "mastodon.status":
		case "mastodon.repost":
			return "/mastodon-logo.svg";
		case "network.cosmik.card":
			return "/semble-logo.svg";
		case "community.lexicon.bookmarks.bookmark":
			return "/sill.svg";
		case "app.rocksky.scrobble":
			return "/rocksky.png";
		case "pub.leaflet.content":
			return "/leaflet.svg";
		case "app.offprint.content":
			return "/offprint.svg";
		case "blog.pckt.content":
			return "/pckt.svg";
		default:
			return null;
	}
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
				{post.parent && <ParentPost parent={post.parent} />}
				{/* Relative wrapper so the source logo anchors to the reply itself,
				    not the card corner — where it would sit over the parent card. */}
				<Box position="relative">
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
							<SourceBadge sources={post.sources} />
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
					{sourceLogo && (
						<img
							src={sourceLogo}
							alt=""
							width="24"
							height="auto"
							style={{
								position: "absolute",
								top: "0",
								right: "0",
								opacity: 0.3,
							}}
						/>
					)}
				</Box>
				<QuotedPost post={post} layout={layout} />
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
		</Card>
	);
};

export default PostRep;
