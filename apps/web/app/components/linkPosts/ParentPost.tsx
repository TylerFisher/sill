import { Avatar, Card, Flex } from "@radix-ui/themes";
import type { RenderedParentPost } from "@sill/schema";
import PostAuthor from "./PostAuthor";
import PostContent from "./PostContent";
import QuotedPost from "./QuotedPost";

/**
 * The post a reply is replying to, shown above the reply as its own card so the
 * reply reads as a response to it. Dense (smaller) text keeps it secondary to
 * the reply; its own quote (when the parent is a quote post) renders beneath.
 * Images on the parent itself are omitted to keep the context compact.
 */
const ParentPost = ({ parent }: { parent: RenderedParentPost }) => {
	return (
		<Card size="1" mb="3" variant="surface">
			<Flex gap="2" align="center" mb="1">
				<a
					href={parent.actorUrl}
					target="_blank"
					rel="noreferrer"
					aria-label={`Link to ${parent.actorName}'s profile page`}
				>
					<Avatar
						size="1"
						radius="full"
						src={parent.actorAvatarUrl || undefined}
						fallback={(parent.actorHandle || "?").charAt(0)}
						style={{ width: "20px", height: "20px" }}
					/>
				</a>
				<PostAuthor
					actor={{
						actorUrl: parent.actorUrl,
						actorName: parent.actorName,
						actorHandle: parent.actorHandle,
						actorAvatarUrl: parent.actorAvatarUrl,
					}}
					postUrl={parent.postUrl}
					postDate={parent.postDate}
					layout="dense"
				/>
			</Flex>
			<PostContent
				post={{
					postText: parent.postText,
					postType: parent.postType,
					postImages: null,
				}}
				layout="dense"
			/>
			<QuotedPost post={parent} layout="dense" />
		</Card>
	);
};

export default ParentPost;
