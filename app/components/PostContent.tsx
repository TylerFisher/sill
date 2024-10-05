import { Card, Inset, Text } from "@radix-ui/themes";
import type { Post, PostImage } from "@prisma/client";

type Overwrite<T, U> = Pick<T, Exclude<keyof T, keyof U>> & U;
type PostWithStringDate = Overwrite<
	Post,
	{ postDate: string; images: PostImage[] }
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
			/>
		) : (
			<Text
				as="p"
				style={{
					whiteSpace: "pre-line",
				}}
			>
				{post.text}
			</Text>
		)}
		{post.images ? (
			post.images.map((image) => (
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
