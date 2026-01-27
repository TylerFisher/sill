import { Card, Inset, Text } from "@radix-ui/themes";
import styles from "./PostContent.module.css";
interface Post {
	postText: string;
	postType: "bluesky" | "mastodon" | "atbookmark";
	postImages:
		| {
				url: string;
				alt: string;
		  }[]
		| null;
}
interface PostContentProps {
	post: Post;
	layout: "default" | "dense";
}

const PostContent = ({ post, layout }: PostContentProps) => {
	if (!post) return null;

	// Process post text to add target="_blank" and rel attributes to all links
	if (post.postText) {
		post.postText = post.postText.replace(
			/<a href/g,
			'<a target="_blank" rel="noopener noreferrer" href',
		);
		// Remove <p> tags with class quote-inline
		post.postText = post.postText.replace(
			/<p[^>]*class="quote-inline"[^>]*>.*?<\/p>/gi,
			"",
		);
	}

	return (
		<>
			<Text
				dangerouslySetInnerHTML={{
					__html: post.postText,
				}}
				className={styles["post-content"]}
				size={{
					initial: layout === "dense" ? "1" : "2",
					sm: layout === "dense" ? "2" : "3",
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
