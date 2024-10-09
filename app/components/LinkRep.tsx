import {
	AspectRatio,
	Card,
	Heading,
	Inset,
	Link,
	Text,
} from "@radix-ui/themes";
import type { Link as DbLink } from "@prisma/client";

interface LinkRepProps {
	link: DbLink;
}

const LinkRep = ({ link }: LinkRepProps) => (
	<Card mb="5">
		{link.imageUrl && (
			<Inset
				mb="4"
				style={{
					borderRadius: 0,
				}}
			>
				<AspectRatio ratio={16 / 9}>
					<Link target="_blank" rel="noreferrer" href={link.url}>
						<img
							src={link.imageUrl}
							loading="lazy"
							alt=""
							decoding="async"
							width="100%"
							height="100%"
							style={{
								objectFit: "cover",
							}}
						/>
					</Link>
				</AspectRatio>
			</Inset>
		)}
		<Text size="1" color="gray" as="p" mt="3" mb="1">
			{new URL(link.url).host}
		</Text>
		<Heading as="h3" size="3">
			<Link
				target="_blank"
				rel="noreferrer"
				href={link.url}
				size="4"
				weight="bold"
			>
				{link.title || link.url}
			</Link>
		</Heading>
		<Text as="p">{link.description}</Text>
	</Card>
);

export default LinkRep;
