import { Card, Inset, Text } from "@radix-ui/themes";
import type { Post, PostImage } from "@prisma/client";
import styles from "./PostContent.module.css";

type Overwrite<T, U> = Pick<T, Exclude<keyof T, keyof U>> & U;
type PostWithStringDate = Overwrite<
	Post,
	{ postDate: string; postImages: PostImage[] }
>;

interface PostContentProps {
	post: PostWithStringDate;
}

const PostContent = ({ post }: PostContentProps) => (
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

export default PostContent;
