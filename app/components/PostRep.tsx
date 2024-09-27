import React from "react";
import { Card, Box, Text, Avatar, Link, Flex } from "@radix-ui/themes";
import type { Post, Actor } from "@prisma/client";

import RepostActor from "~/components/RepostActor";
import PostAuthor from "~/components/PostAuthor";
import PostContent from "~/components/PostContent";

type Overwrite<T, U> = Pick<T, Exclude<keyof T, keyof U>> & U;

type PostWithActor = Overwrite<
	Post,
	{
		actor: Actor;
		postDate: string;
	}
>;

interface PostProp extends PostWithActor {
	quoting: PostWithActor | null;
}

interface PostRepProps {
	post: PostProp;
	linkPostActor: Actor;
}

const PostRep = ({ post, linkPostActor }: PostRepProps) => (
	<Card key={post.id} mb="5">
		<Flex gap="3" align="start" mb="1">
			<Avatar
				size="3"
				src={post.actor.avatarUrl || undefined}
				radius="full"
				fallback="T"
				mt={linkPostActor.handle !== post.actor.handle ? "4" : "1"}
			/>
			<Box>
				{linkPostActor.handle !== post.actor.handle && (
					<RepostActor actor={linkPostActor} />
				)}
				<PostAuthor
					actor={post.actor}
					postUrl={post.url}
					postDate={new Date(post.postDate)}
				/>
				<PostContent post={post} />
			</Box>
		</Flex>
		{post.quoting && (
			<Card ml="8">
				<Flex gap="1" mb="1">
					<Avatar
						size="1"
						src={post.quoting.actor.avatarUrl || undefined}
						radius="full"
						fallback="T"
					/>
					<PostAuthor
						actor={post.quoting.actor}
						postUrl={post.quoting.url}
						postDate={new Date(post.quoting.postDate)}
					/>
				</Flex>

				<PostContent post={post.quoting} />
			</Card>
		)}
	</Card>
);

export default PostRep;
