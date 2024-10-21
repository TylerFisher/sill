import { Card, Box, Avatar, Flex } from "@radix-ui/themes";
import RepostActor from "~/components/RepostActor";
import PostAuthor from "~/components/PostAuthor";
import PostContent from "~/components/PostContent";
import type { MostRecentLinkPosts } from "~/routes/links.server";
interface PostRepProps {
	post: MostRecentLinkPosts["post"];
	group: MostRecentLinkPosts[];
}

const PostRep = ({ post, group }: PostRepProps) => {
	const reposters = group
		.filter(
			(l) => l.post.repostHandle !== l.post.actorHandle && l.post.reposter,
		)
		.map((l) => l.post.reposter)
		.filter((l) => l !== null);

	return (
		<Card key={post.id} mt="5">
			<Flex gap="3" align="start" mb="1">
				<a href={post.actor.url} target="_blank" rel="noreferrer">
					<Avatar
						size="3"
						src={post.actor.avatarUrl || undefined}
						radius="full"
						fallback={post.actorHandle[0]}
						mt={reposters.length > 0 ? "4" : "1"}
						loading="lazy"
						decoding="async"
					/>
				</a>
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
				<Card ml="8" mt="2">
					<Flex gap="1" mb="1">
						<Avatar
							size="1"
							src={post.quoting.actor.avatarUrl || undefined}
							radius="full"
							fallback={post.quoting.actorHandle[0]}
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
