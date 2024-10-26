import { Card, Box, Avatar, Flex, Separator } from "@radix-ui/themes";
import RepostActor from "~/components/linkPosts/RepostActor";
import PostAuthor from "~/components/linkPosts/PostAuthor";
import PostContent from "~/components/linkPosts/PostContent";
import type { MostRecentLinkPosts } from "~/utils/links.server";
import type { SerializeFrom } from "@vercel/remix";
import PostToolbar from "./PostToolbar";
interface PostRepProps {
	post: SerializeFrom<MostRecentLinkPosts["post"]>;
	group: SerializeFrom<MostRecentLinkPosts>[];
}

const PostRep = ({ post, group }: PostRepProps) => {
	const reposters = group
		.filter(
			(l) => l.post.repostHandle !== l.post.actorHandle && l.post.reposter,
		)
		.map((l) => l.post.reposter)
		.filter((l) => l !== null);

	return (
		<Card key={post.id} mt="5" size="1">
			<Flex
				gap={{
					initial: "2",
					sm: "3",
				}}
				align="start"
				mb="1"
			>
				<a
					href={post.actor.url}
					target="_blank"
					rel="noreferrer"
					aria-label={`Link to ${post.actor.name}'s profile page`}
				>
					<Avatar
						size={{
							initial: "2",
							sm: "3",
						}}
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
				<Card
					ml={{
						initial: "6",
						sm: "8",
					}}
					mt="2"
					size="1"
				>
					<Flex gap="1" mb="1" align="center">
						<a
							href={post.quoting.actor.url}
							target="_blank"
							rel="noreferrer"
							aria-label={`Link to ${post.quoting.actor.name}'s profile page`}
						>
							<Avatar
								src={post.quoting.actor.avatarUrl || undefined}
								radius="full"
								fallback={post.quoting.actorHandle[0]}
								style={{
									width: "20px",
									height: "20px",
									verticalAlign: "text-bottom",
								}}
							/>
						</a>
						<PostAuthor
							actor={post.quoting.actor}
							postUrl={post.quoting.url}
							postDate={new Date(post.quoting.postDate)}
						/>
					</Flex>
					<PostContent post={post.quoting} />
				</Card>
			)}
			<Separator size="4" my="4" />
			<PostToolbar post={post} />
		</Card>
	);
};

export default PostRep;
