import { Button, Link, Popover, Text } from "@radix-ui/themes";
import PostAuthor from "~/components/linkPosts/PostAuthor";
import type { linkPostDenormalized } from "@sill/schema";

interface RepostActorProps {
	posts: (typeof linkPostDenormalized.$inferSelect)[];
}

interface SingleActorProps {
	post: typeof linkPostDenormalized.$inferSelect;
}

const SingleActor = ({ post }: SingleActorProps) => (
	<Text size="1" as="p" color="gray">
		Reposted by{" "}
		<Link
			href={post.repostActorUrl || ""}
			target="_blank"
			rel="noreferrer"
			underline="hover"
			color="gray"
		>
			{post.repostActorName || post.repostActorHandle}
		</Link>
	</Text>
);

const MultipleActors = ({ posts }: RepostActorProps) => (
	<Popover.Root>
		<Text size="1" as="p" color="gray">
			<Popover.Trigger>
				<Button variant="ghost" size="1">
					Reposted by {posts.length} accounts
				</Button>
			</Popover.Trigger>
		</Text>
		<Popover.Content size="1">
			{posts.map((post) => (
				<PostAuthor
					actor={{
						actorUrl: post.repostActorUrl || "",
						actorName: post.repostActorName,
						actorHandle: post.repostActorHandle || "",
						actorAvatarUrl: post.repostActorUrl,
					}}
					postUrl={post.postUrl}
					key={post.actorHandle}
					layout="dense" // force smaller type
				/>
			))}
		</Popover.Content>
	</Popover.Root>
);

const RepostActor = ({ posts }: RepostActorProps) => {
	const uniqueActors = Array.from(
		new Set(posts.map((post) => post.repostActorHandle)),
	);

	return (
		<>
			{uniqueActors.length === 1 ? (
				<SingleActor post={posts[0]} />
			) : (
				<MultipleActors posts={posts} />
			)}
		</>
	);
};

export default RepostActor;
