import { Button, Popover, Link, Text } from "@radix-ui/themes";
import PostAuthor from "~/components/linkPosts/PostAuthor";
import type { MostRecentLinkPosts, PostReturn } from "~/utils/links.server";

interface RepostActorProps {
	actors: PostReturn["actor"][];
}

interface SingleActorProps {
	actor: PostReturn["actor"];
}

const SingleActor = ({ actor }: SingleActorProps) => (
	<Text size="1" as="p" color="gray">
		Reposted by{" "}
		<Link
			href={actor.url}
			target="_blank"
			rel="noreferrer"
			underline="hover"
			color="gray"
		>
			{actor.name}
		</Link>
	</Text>
);

const MultipleActors = ({ actors }: RepostActorProps) => (
	<Popover.Root>
		<Text size="1" as="p" color="gray">
			<Popover.Trigger>
				<Button variant="ghost" size="1">
					Reposted by {actors.length} people
				</Button>
			</Popover.Trigger>
		</Text>
		<Popover.Content size="1">
			{actors.map((actor) => (
				<PostAuthor actor={actor} key={actor.id} />
			))}
		</Popover.Content>
	</Popover.Root>
);

const RepostActor = ({ actors }: RepostActorProps) => (
	<>
		{actors.length === 1 ? (
			<SingleActor actor={actors[0]} />
		) : (
			<MultipleActors actors={actors} />
		)}
	</>
);

export default RepostActor;
