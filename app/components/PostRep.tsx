import { Card, Box, Avatar, Flex } from "@radix-ui/themes";
import type { Post, Actor, LinkPost, Link } from "@prisma/client";

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

export interface PostProp extends PostWithActor {
	quoting: PostWithActor | null;
}

export interface ExtendedLinkPost extends LinkPost {
	post: PostProp;
	actor: Actor;
	link: Link;
}
interface PostRepProps {
	post: PostProp;
	group: ExtendedLinkPost[];
}

const PostRep = ({ post, group }: PostRepProps) => {
	const reposters = group
		.filter((l) => l.actorHandle !== l.post.actorHandle)
		.map((l) => l.actor);

	return (
		<Card key={post.id} mb="5">
			<Flex gap="3" align="start" mb="1">
				<Avatar
					size="3"
					src={post.actor.avatarUrl || undefined}
					radius="full"
					fallback="T"
					mt={reposters.length > 0 ? "4" : "1"}
				/>
				<Box>
					{reposters.length > 0 && <RepostActor actors={reposters} />}
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
};

export default PostRep;
