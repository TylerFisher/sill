import { Card, Inset, Text } from "@radix-ui/themes";
import styles from "./PostContent.module.css";
import type { PostReturn } from "~/utils/links.server";
import type { SerializeFrom } from "@vercel/remix";

interface PostContentProps {
	post: PostReturn["post"];
	image: PostReturn["image"] | null;
}

const PostContent = ({ post, image }: PostContentProps) => {
	if (!post) return null;
	return (
		<>
			{post.postType === "mastodon" ? (
				<Text
					dangerouslySetInnerHTML={{
						__html: post.text,
					}}
					className={styles["mastodon-post-content"]}
					size={{
						initial: "2",
						sm: "3",
					}}
				/>
			) : (
				<Text
					as="p"
					className={styles["bluesky-post-content"]}
					size={{
						initial: "2",
						sm: "3",
					}}
				>
					{post.text}
				</Text>
			)}
			{image ? (
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
			) : (
				<></>
			)}
		</>
	);
};

export default PostContent;
