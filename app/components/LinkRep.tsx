import { Heading, Link, Text } from "@radix-ui/themes";
import type { Link as DbLink } from "@prisma/client";

interface LinkRepProps {
	link: DbLink;
	numPosts: number;
}

const LinkRep = ({ link, numPosts }: LinkRepProps) => (
	<Heading size="4" mb="5" as="h2">
		<Link
			target="_blank"
			rel="noreferrer"
			href={link.url}
			size="6"
			weight="bold"
		>
			{link.title || link.url}
		</Link>{" "}
		<Text weight="regular"> posted by {numPosts} people</Text>
	</Heading>
);

export default LinkRep;
