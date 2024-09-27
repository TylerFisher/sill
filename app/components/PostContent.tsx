import React from "react";
import { Text } from "@radix-ui/themes";
import type { Post } from "@prisma/client";

type Overwrite<T, U> = Pick<T, Exclude<keyof T, keyof U>> & U;
type PostWithStringDate = Overwrite<Post, { postDate: string }>;

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
			<Text as="p">{post.text}</Text>
		)}
	</>
);

export default PostContent;
