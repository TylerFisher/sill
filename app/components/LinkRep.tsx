import { Card, Inset, Link, Text } from "@radix-ui/themes";
import type { Link as DbLink } from "@prisma/client";

interface LinkRepProps {
	link: DbLink;
}

const LinkRep = ({ link }: LinkRepProps) => (
	<Card mb="5">
		{link.imageUrl && (
			<Inset mb="4">
				<Link target="_blank" rel="noreferrer" href={link.url}>
					<img
						src={link.imageUrl}
						loading="lazy"
						alt=""
						decoding="async"
						width="100%"
					/>
				</Link>
			</Inset>
		)}
		<Text size="1" color="gray">
			{new URL(link.url).host}
		</Text>
		<Text size="3" as="p">
			<Link
				target="_blank"
				rel="noreferrer"
				href={link.url}
				size="4"
				weight="bold"
			>
				{link.title || link.url}
			</Link>
		</Text>
		<Text>{link.description}</Text>
	</Card>
);

export default LinkRep;
