import { Card, Inset, Link, Text } from "@radix-ui/themes";
import styles from "./PostContent.module.css";
import type { PostReturn } from "~/utils/links.server";

interface PostContentProps {
	post: PostReturn["post"];
	image: PostReturn["image"] | null;
}

const PostContent = ({ post, image }: PostContentProps) => {
	if (!post) return null;
	return (
		<>
			<Text
				dangerouslySetInnerHTML={{
					__html: post.text,
				}}
				className={styles["post-content"]}
				size={{
					initial: "2",
					sm: "3",
				}}
				as={post.postType === "bluesky" ? "p" : "div"}
			/>
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
