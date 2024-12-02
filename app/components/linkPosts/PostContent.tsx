import { Card, Inset, Link, Text } from "@radix-ui/themes";
import type { PostReturn } from "~/utils/links.server";
import styles from "./PostContent.module.css";
import type { linkPostDenormalized } from "~/drizzle/schema.server";

interface Post {
	postText: string;
	postType: "bluesky" | "mastodon";
	postImages:
		| {
				url: string;
				alt: string;
		  }[]
		| null;
}
interface PostContentProps {
	post: Post;
}

const PostContent = ({ post }: PostContentProps) => {
	if (!post) return null;
	return (
		<>
			<Text
				dangerouslySetInnerHTML={{
					__html: post.postText,
				}}
				className={styles["post-content"]}
				size={{
					initial: "2",
					sm: "3",
				}}
				as={post.postType === "bluesky" ? "p" : "div"}
			/>
			{post.postImages &&
				post.postImages.length > 0 &&
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
				))}
		</>
	);
};

export default PostContent;
