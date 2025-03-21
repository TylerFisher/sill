import {
	AspectRatio,
	Box,
	Card,
	Flex,
	Heading,
	Inset,
	Link,
	Separator,
	Text,
} from "@radix-ui/themes";
import * as ReactTweet from "react-tweet";
import Youtube from "react-youtube";
import { ClientOnly } from "remix-utils/client-only";
import type { MostRecentLinkPosts } from "~/utils/links.server";
import styles from "./LinkRep.module.css";
import Toolbar from "./Toolbar";
import { useTheme } from "~/routes/resources/theme-switch";
const { Tweet } = ReactTweet;

interface LinkRepProps {
	link: MostRecentLinkPosts["link"];
	instance: string | undefined;
	bsky: string | undefined;
	layout: "dense" | "default";
	toolbar?: boolean;
	isBookmarked: boolean;
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
	const adjusted = url.href.split("/photo/")[0];
	return (
		<ClientOnly>
			{() => <Tweet id={adjusted.split("/").pop() || ""} />}
		</ClientOnly>
	);
};

const LinkRep = ({
	link,
	instance,
	bsky,
	layout,
	toolbar = true,
	isBookmarked,
}: LinkRepProps) => {
	if (!link) return null;
	const url = new URL(link.url);
	const host = url.host.replace("www.", "");
	const theme = useTheme();

	return (
		<Card mb="5">
			{link.imageUrl &&
				layout === "default" &&
				url.hostname !== "www.youtube.com" &&
				url.hostname !== "youtu.be" &&
				url.hostname !== "twitter.com" && (
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
			<Box
				position="relative"
				mt={link.imageUrl && layout === "default" ? "3" : "0"}
			>
				<Flex align="center" mb="1">
					<img
						src={`https://s2.googleusercontent.com/s2/favicons?domain=${host}&sz=32`}
						loading="lazy"
						alt=""
						width="16px"
						height="16px"
						decoding="async"
						style={{
							marginRight: "0.25rem",
							backgroundColor: theme === "dark" ? "white" : "transparent",
						}}
					/>
					<Text size="1" color="gray" as="span">
						{host}
					</Text>
				</Flex>
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
			{toolbar && (
				<>
					<Inset mt="4">
						<Separator orientation="horizontal" size="4" my="4" />
					</Inset>
					<Toolbar
						url={link.url}
						giftUrl={link.giftUrl}
						narrowMutePhrase={link.url}
						broadMutePhrase={host}
						instance={instance}
						bsky={bsky}
						type="link"
						isBookmarked={isBookmarked}
					/>
				</>
			)}
		</Card>
	);
};

export default LinkRep;
