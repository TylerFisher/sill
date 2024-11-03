import { Avatar, Box, Card, Flex, Separator } from "@radix-ui/themes";
import PostAuthor from "~/components/linkPosts/PostAuthor";
import PostContent from "~/components/linkPosts/PostContent";
import RepostActor from "~/components/linkPosts/RepostActor";
import type { PostReturn } from "~/utils/links.server";
import Toolbar from "./Toolbar";
interface PostRepProps {
	post: PostReturn["post"];
	group: PostReturn[];
	actor: PostReturn["actor"];
	quote: PostReturn["quote"];
	image: PostReturn["image"];
}

const PostRep = ({ post, group, actor, quote, image }: PostRepProps) => {
	const reposters = group
		.filter((l) => l.post.repostHandle !== l.post.actorHandle && l.reposter)
		.map((l) => l.reposter)
		.filter((l) => l !== undefined);

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
					href={actor.url}
					target="_blank"
					rel="noreferrer"
					aria-label={`Link to ${actor.name}'s profile page`}
				>
					<Avatar
						size={{
							initial: "2",
							sm: "3",
						}}
						src={actor.avatarUrl || undefined}
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
						actor={actor}
						postUrl={post.url}
						postDate={new Date(`${post.postDate}Z`)}
					/>
					<PostContent post={post} image={image} />
				</Box>
			</Flex>
			{quote.post && quote.actor && (
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
							href={quote.actor.url}
							target="_blank"
							rel="noreferrer"
							aria-label={`Link to ${quote.actor.name}'s profile page`}
						>
							<Avatar
								src={quote.actor.avatarUrl || undefined}
								radius="full"
								fallback={quote.actor.handle[0]}
								style={{
									width: "20px",
									height: "20px",
									verticalAlign: "text-bottom",
								}}
							/>
						</a>
						<PostAuthor
							actor={quote.actor}
							postUrl={quote.post.url}
							postDate={new Date(`${quote.post.postDate}Z`)}
						/>
					</Flex>
					<PostContent post={quote.post} image={quote.image} />
				</Card>
			)}
			<Separator size="4" my="4" />
			<Toolbar
				url={post.url}
				narrowMutePhrase={post.url}
				broadMutePhrase={post.actorHandle}
				type="post"
			/>
		</Card>
	);
};

export default PostRep;
