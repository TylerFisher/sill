import type { Actor } from "@prisma/client";
import { Link, Text } from "@radix-ui/themes";

interface RepostActorProps {
	actor: Actor;
}

const RepostActor = ({ actor }: RepostActorProps) => (
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

export default RepostActor;
