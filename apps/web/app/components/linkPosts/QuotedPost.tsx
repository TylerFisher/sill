import { Avatar, Card, Flex } from "@radix-ui/themes";
import type { LinkPost } from "@sill/schema";
import PostAuthor from "./PostAuthor";
import PostContent from "./PostContent";

/** The `quoted*` slice of a rendered post — what a quoted card needs. */
type QuotedFields = Pick<
	LinkPost,
	| "quotedActorUrl"
	| "quotedActorName"
	| "quotedActorHandle"
	| "quotedActorAvatarUrl"
	| "quotedPostUrl"
	| "quotedPostText"
	| "quotedPostDate"
	| "quotedPostType"
	| "quotedPostImages"
>;

/**
 * The embedded quote card shown beneath a post (and beneath a reply parent).
 * Indented and bordered so it reads as a post-within-a-post. Renders nothing
 * when the post has no resolved quote.
 */
const QuotedPost = ({
	post,
	layout,
}: {
	post: QuotedFields;
	layout: "default" | "dense";
}) => {
	if (!(post.quotedPostUrl && post.quotedActorHandle && post.quotedPostDate)) {
		return null;
	}
	return (
		<Card ml={{ initial: "6", sm: "8" }} mt="2" size="1">
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
	);
};

export default QuotedPost;
