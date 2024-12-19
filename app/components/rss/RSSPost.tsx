import { Blockquote, Box, Heading, Text, Link } from "@radix-ui/themes";
import type { MostRecentLinkPosts } from "~/utils/links.server";
import RSSRepost from "./RSSRepost";

const RSSPost = ({
	postUrl,
	group,
}: { postUrl: string; group: MostRecentLinkPosts["posts"] }) => {
	if (!group) return null;
	const post = group[0];
	return (
		<Box key={postUrl}>
			<RSSRepost group={group} />
			<Heading as="h5">
				{post.actorName} ({post.actorHandle})
			</Heading>
			<Blockquote>
				<Text
					as="p"
					dangerouslySetInnerHTML={{
						__html: post.postText,
					}}
				/>
				{post.quotedPostText && (
					<Blockquote>
						<Heading as="h5">
							{post.quotedActorName} ({post.quotedActorHandle})
						</Heading>
						<Text
							as="p"
							dangerouslySetInnerHTML={{ __html: post.quotedPostText }}
						/>
						<Text as="p">
							<Link href={post.quotedPostUrl || ""}>
								{post.quotedPostDate?.toLocaleDateString()}{" "}
								{post.quotedPostDate?.toLocaleTimeString()}
							</Link>
						</Text>
					</Blockquote>
				)}
			</Blockquote>

			<Text as="p">
				<Link href={post.postUrl}>
					{group[0].postDate.toLocaleDateString()}{" "}
					{group[0].postDate?.toLocaleTimeString()}
				</Link>
			</Text>
		</Box>
	);
};

export default RSSPost;
