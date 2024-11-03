import {
	AspectRatio,
	Box,
	Button,
	Card,
	DropdownMenu,
	Heading,
	IconButton,
	Inset,
	Link,
	Text,
} from "@radix-ui/themes";
import styles from "./LinkRep.module.css";
import type { MostRecentLinkPosts } from "~/utils/links.server";
import { useFetcher } from "@remix-run/react";
import { Ellipsis } from "lucide-react";
import { ClientOnly } from "remix-utils/client-only";
import Youtube from "react-youtube";
import * as ReactTweet from "react-tweet";
const { Tweet } = ReactTweet;

interface LinkRepProps {
	link: MostRecentLinkPosts["link"];
}

const YoutubeEmbed = ({ url }: { url: URL }) => {
	const id = url.searchParams.get("v") || url.pathname.split("/").pop();
	const opts = {
		width: "100%",
	};
	return (
		<Box mb="5" width="100%">
			<ClientOnly>{() => <Youtube videoId={id} opts={opts} />}</ClientOnly>
		</Box>
	);
};

const XEmbed = ({ url }: { url: URL }) => {
	return (
		<ClientOnly>
			{() => <Tweet id={url.href.split("/").pop() || ""} />}
		</ClientOnly>
	);
};

const LinkRep = ({ link }: LinkRepProps) => {
	if (!link) return null;
	const fetcher = useFetcher();
	const url = new URL(link.url);
	const host = url.host;

	return (
		<Card mb="5">
			{link.imageUrl &&
				url.hostname !== "www.youtube.com" &&
				url.hostname !== "youtu.be" && (
					<Inset mb="4" className={styles.inset}>
						<AspectRatio ratio={16 / 9}>
							<Link
								target="_blank"
								rel="noreferrer"
								href={link.url}
								aria-label={link.title}
							>
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
			{(url.hostname === "www.youtube.com" || url.hostname === "youtu.be") && (
				<Inset mb="4" className={styles.inset}>
					<YoutubeEmbed url={url} />
				</Inset>
			)}
			{(url.hostname === "twitter.com" || url.hostname === "x.com") && (
				<Inset mb="4" mt="-5" className={styles.inset}>
					<XEmbed url={url} />
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
				<Heading
					as="h3"
					size={{
						initial: "3",
						sm: "4",
					}}
				>
					<Link target="_blank" rel="noreferrer" href={link.url} weight="bold">
						{link.title || link.url}
					</Link>
				</Heading>
				<Text
					as="p"
					size={{
						initial: "2",
						sm: "3",
					}}
					mt="1"
				>
					{link.description}
				</Text>
				<Box position="absolute" top="0" right="0">
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							<IconButton variant="ghost" aria-label="Link options">
								<Ellipsis width="18" height="18" />
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
							<fetcher.Form method="POST" action="/moderation">
								<input type="hidden" name="newPhrase" value={host} />
								<DropdownMenu.Item>
									{" "}
									<Button
										type="submit"
										variant="ghost"
										style={{
											color: "white",
										}}
									>
										Mute {host}
									</Button>
								</DropdownMenu.Item>
							</fetcher.Form>
							<fetcher.Form method="POST" action="/moderation">
								<input type="hidden" name="newPhrase" value={link.url} />
								<DropdownMenu.Item>
									<Button
										type="submit"
										variant="ghost"
										style={{
											color: "white",
										}}
									>
										Mute this link
									</Button>
								</DropdownMenu.Item>
							</fetcher.Form>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</Box>
			</Box>
		</Card>
	);
};

export default LinkRep;
