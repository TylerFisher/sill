import {
	AspectRatio,
	Box,
	Card,
	Heading,
	Inset,
	Link,
	Text,
} from "@radix-ui/themes";
import Youtube from "react-youtube";
import styles from "./LinkRep.module.css";
import type { MostRecentLinkPosts } from "~/routes/links.server";

interface LinkRepProps {
	link: MostRecentLinkPosts["link"];
}

const YoutubeEmbed = ({ url }: { url: URL }) => {
	const id = url.searchParams.get("v") || url.pathname;
	return (
		<Box mb="5">
			<AspectRatio ratio={16 / 9}>
				<Youtube videoId={id} />
			</AspectRatio>
		</Box>
	);
};

const LinkRep = ({ link }: LinkRepProps) => {
	const url = new URL(link.url);
	if (url.hostname === "www.youtube.com" || url.hostname === "youtu.be") {
		return <YoutubeEmbed url={url} />;
	}
	return (
		<Card mb="5">
			{link.imageUrl && (
				<Inset mb="4" className={styles.inset}>
					<AspectRatio ratio={16 / 9}>
						<Link target="_blank" rel="noreferrer" href={link.url}>
							<img
								src={link.imageUrl}
								loading="lazy"
								alt=""
								decoding="async"
								width="100%"
								height="100%"
								className={styles["link-image"]}
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
};

export default LinkRep;
