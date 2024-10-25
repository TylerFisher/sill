import {
	AspectRatio,
	Box,
	Card,
	DropdownMenu,
	Heading,
	IconButton,
	Inset,
	Link,
	Text,
} from "@radix-ui/themes";
import Youtube from "react-youtube";
import styles from "./LinkRep.module.css";
import type { MostRecentLinkPosts } from "~/utils/links.server";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { useFetcher } from "@remix-run/react";

interface LinkRepProps {
	link: MostRecentLinkPosts["link"];
}

const YoutubeEmbed = ({ url }: { url: URL }) => {
	const id = url.searchParams.get("v") || url.pathname;
	const opts = {
		width: "100%",
	};
	return (
		<Box mb="5" width="100%">
			<Youtube videoId={id} opts={opts} />
		</Box>
	);
};

const LinkRep = ({ link }: LinkRepProps) => {
	const fetcher = useFetcher();
	const url = new URL(link.url);
	if (url.hostname === "www.youtube.com" || url.hostname === "youtu.be") {
		return <YoutubeEmbed url={url} />;
	}
	const host = url.host;
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
			<Box position="relative">
				<Text
					size="1"
					color="gray"
					as="p"
					mt={link.imageUrl ? "3" : "0"}
					mb="1"
				>
					{host}
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
				<Box position="absolute" top="0" right="0">
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							<IconButton variant="ghost">
								<DotsHorizontalIcon />
							</IconButton>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content>
							<a
								href={`https://shareopenly.org/share/?url=${link.url}`}
								target="_blank"
								rel="noreferrer"
								style={{
									color: "inherit",
									textDecoration: "none",
								}}
							>
								<DropdownMenu.Item>Share</DropdownMenu.Item>
							</a>

							<DropdownMenu.Item>
								<fetcher.Form method="POST" action="/moderation">
									<input type="hidden" name="newPhrase" value={host} />
									<button
										type="submit"
										style={{
											all: "unset",
										}}
									>
										Mute {host}
									</button>
								</fetcher.Form>
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</Box>
			</Box>
		</Card>
	);
};

export default LinkRep;
