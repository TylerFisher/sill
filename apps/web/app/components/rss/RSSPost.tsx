import { Blockquote, Box, Heading, Link, Text } from "@radix-ui/themes";
import type { MostRecentLinkPosts } from "@sill/schema";
import { postViewLabel } from "~/utils/postSource";
import RSSRepost from "./RSSRepost";

const RSSPost = ({
	postUrl,
	group,
}: { postUrl: string; group: MostRecentLinkPosts["posts"] }) => {
	if (!group) return null;
	const post = group[0];
	const viewLabel = postViewLabel(post.postType, post.collection, post.postUrl);
	// Quoted posts are always a Bluesky/Mastodon post (no atbookmark collection),
	// so the noun comes from quotedPostType.
	const quotedViewLabel = post.quotedPostType
		? postViewLabel(post.quotedPostType, null, post.quotedPostUrl)
		: null;
	return (
		<Box key={postUrl}>
			<Blockquote>
				<RSSRepost group={group} />
				<Heading as="h4">
					<Link href={post.actorUrl}>
						{post.actorName} (@{post.actorHandle})
					</Link>
				</Heading>
				<Text
					as="p"
					dangerouslySetInnerHTML={{
						__html: post.postText,
					}}
				/>
				{post.postImages && (
					<Box>
						{post.postImages.map((image) => (
							<img src={image.url} alt={image.alt} key={image.url} />
						))}
					</Box>
				)}
				{post.quotedPostText && (
					<Blockquote>
						<Heading as="h5">
							<Link href={post.quotedActorUrl || ""}>
								{post.quotedActorName} (@{post.quotedActorHandle})
							</Link>
						</Heading>
						<Text
							as="p"
							dangerouslySetInnerHTML={{ __html: post.quotedPostText }}
						/>
						{post.quotedPostImages && (
							<Box>
								{post.quotedPostImages.map((image) => (
									<img src={image.url} alt={image.alt} key={image.url} />
								))}
							</Box>
						)}
						{quotedViewLabel && post.quotedPostUrl && (
							<Text as="p">
								<Link href={post.quotedPostUrl}>
									<small>{quotedViewLabel}</small>
								</Link>
							</Text>
						)}
					</Blockquote>
				)}
				{viewLabel && (
					<Text as="p">
						<Link href={post.postUrl}>
							<small>{viewLabel}</small>
						</Link>
					</Text>
				)}
			</Blockquote>
		</Box>
	);
};

export default RSSPost;
