import { Card, Inset, Text } from "@radix-ui/themes";
import styles from "./PostContent.module.css";
import type { MostRecentLinkPosts } from "~/utils/links.server";
import type { SerializeFrom } from "@vercel/remix";

interface PostContentProps {
	post:
		| SerializeFrom<MostRecentLinkPosts["post"]>
		| SerializeFrom<MostRecentLinkPosts["post"]["quoting"]>;
}

const PostContent = ({ post }: PostContentProps) => {
	if (!post) return null;
	return (
		<>
			{post.postType === "mastodon" ? (
				<div
					dangerouslySetInnerHTML={{
						__html: post.text,
					}}
					className={styles["mastodon-post-content"]}
				/>
			) : (
				<Text as="p" className={styles["bluesky-post-content"]}>
					{post.text}
				</Text>
			)}
			{post.postImages ? (
				post.postImages.map((image) => (
					<Card key={image.url} mt="2">
						<Inset>
							<img
								src={image.url}
								alt={image.alt}
								loading="lazy"
								decoding="async"
								width="100%"
							/>
						</Inset>
					</Card>
				))
			) : (
				<></>
			)}
		</>
	);
};

export default PostContent;
