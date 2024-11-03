import {
	AspectRatio,
	Box,
	Button,
	Card,
	DropdownMenu,
	Flex,
	Heading,
	IconButton,
	Inset,
	Link,
	Separator,
	Text,
} from "@radix-ui/themes";
import { useFetcher } from "@remix-run/react";
import {
	Check,
	Copy,
	Ellipsis,
	ExternalLink,
	MessageSquareOff,
} from "lucide-react";
import * as ReactTweet from "react-tweet";
import Youtube from "react-youtube";
import { ClientOnly } from "remix-utils/client-only";
import type { MostRecentLinkPosts } from "~/utils/links.server";
import styles from "./LinkRep.module.css";
import ShareOpenly from "../icons/ShareOpenly";
import { useEffect, useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import PostToolbar from "./Toolbar";
import Toolbar from "./Toolbar";
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
	const [copied, setCopied] = useState(false);
	const fetcher = useFetcher();
	const url = new URL(link.url);
	const host = url.host;

	useEffect(() => {
		if (copied) {
			const timeout = setTimeout(() => {
				setCopied(false);
			}, 2000);
			return () => clearTimeout(timeout);
		}
	}, [copied]);

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
				<Inset mb="-4" className={styles.inset}>
					<YoutubeEmbed url={url} />
				</Inset>
			)}
			{(url.hostname === "twitter.com" || url.hostname === "x.com") && (
				<Inset mt="-5" className={styles.inset}>
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
			</Box>
			<Separator orientation="horizontal" size="4" my="4" />
			<Toolbar
				url={link.url}
				narrowMutePhrase={link.url}
				broadMutePhrase={host}
				type="link"
			/>
		</Card>
	);
};

export default LinkRep;
