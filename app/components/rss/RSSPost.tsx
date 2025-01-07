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
			<Blockquote className="twitter-tweet">
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
					<Blockquote className="twitter-tweet">
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
						{post.quotedPostType && post.quotedPostUrl && (
							<Text as="p">
								<Link href={post.quotedPostUrl}>
									<small>
										View post on{" "}
										{post.quotedPostType.charAt(0).toUpperCase() +
											post.quotedPostType.slice(1)}{" "}
										→
									</small>
								</Link>
							</Text>
						)}
					</Blockquote>
				)}
				<Text as="p">
					<Link href={post.postUrl}>
						<small>
							View post on{" "}
							{post.postType.charAt(0).toUpperCase() + post.postType.slice(1)} →
						</small>
					</Link>
				</Text>
			</Blockquote>
		</Box>
	);
};

export default RSSPost;
