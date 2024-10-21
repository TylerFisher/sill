import { Button, Dialog, Link, Text } from "@radix-ui/themes";
import PostAuthor from "./PostAuthor";
import type { MostRecentLinkPosts } from "~/routes/links.server";

interface RepostActorProps {
	actors: MostRecentLinkPosts["post"]["actor"][];
}

interface SingleActorProps {
	actor: MostRecentLinkPosts["post"]["actor"];
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
	<Dialog.Root>
		<Text size="1" as="p" color="gray">
			<Dialog.Trigger>
				<Button variant="ghost" size="1">
					Reposted by {actors.length} people
				</Button>
			</Dialog.Trigger>
		</Text>
		<Dialog.Content maxWidth="450px">
			<Dialog.Title>Reposted by {actors.length} people</Dialog.Title>
			{actors.map((actor) => (
				<PostAuthor actor={actor} key={actor.id} />
			))}
		</Dialog.Content>
	</Dialog.Root>
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
