import { Box, Card, Inset, Separator, Text } from "@radix-ui/themes";
import type { MostRecentLinkPosts } from "~/utils/links.server";
import styles from "./LinkRep.module.css";
import Toolbar from "./Toolbar";
import ToolDropdown from "./ToolDropdown";
import { useTheme } from "~/routes/resources/theme-switch";
import LinkTitle from "./link/LinkTitle";
import type { SubscriptionStatus } from "~/utils/auth.server";
import YoutubeEmbed from "./link/YoutubeEmbed";
import XEmbed from "./link/XEmbed";
import LinkImage from "./link/LinkImage";
import LinkMetadata from "./link/LinkMetadata";
import LinkDescription from "./link/LinkDescription";
import DisplayHost from "./link/DisplayHost";
import { useClientMetadata } from "~/hooks/useClientMetadata";
interface LinkRepProps {
	link: MostRecentLinkPosts["link"];
	instance: string | undefined;
	bsky: string | undefined;
	layout: "dense" | "default";
	toolbar?: boolean;
	isBookmarked: boolean;
	subscribed: SubscriptionStatus;
}

interface WrapperComponentProps extends React.PropsWithChildren {
	layout: "default" | "dense";
}

const WrapperComponent = ({ layout, children }: WrapperComponentProps) => {
	if (layout === "dense") {
		return <Box mb="5">{children}</Box>;
	}
	return <Card mb="5">{children}</Card>;
};

const LinkRep = ({
	link,
	instance,
	bsky,
	layout,
	toolbar = true,
	isBookmarked,
	subscribed,
}: LinkRepProps) => {
	if (!link) return null;
	const url = new URL(link.url);
	const host = url.host.replace("www.", "");
	const theme = useTheme();

	const { clientMetadata } = useClientMetadata({
		url: link.url,
		metadata: link.metadata,
	});

	const effectiveLink = clientMetadata
		? {
				...link,
				title: clientMetadata.title || link.title,
				description: clientMetadata.description || link.description,
				imageUrl: clientMetadata.imageUrl || link.imageUrl,
				authors: clientMetadata.authors || link.authors,
				publishedDate: clientMetadata.publishedDate || link.publishedDate,
				topics: clientMetadata.topics || link.topics,
				siteName: clientMetadata.siteName || link.siteName,
				metadata: clientMetadata.metadata || link.metadata,
			}
		: link;

	return (
		<WrapperComponent layout={layout}>
			<LinkImage link={effectiveLink} url={url} layout={layout} />
			{(url.hostname === "www.youtube.com" || url.hostname === "youtu.be") &&
				layout === "default" && (
					<Inset mb="-4" className={styles.inset}>
						<YoutubeEmbed url={url} />
					</Inset>
				)}
			{(url.hostname === "twitter.com" || url.hostname === "x.com") &&
				layout === "default" && (
					<Inset mt="-5" className={styles.inset}>
						<XEmbed url={url} />
					</Inset>
				)}
			{layout === "default" && (
				<DisplayHost link={effectiveLink} host={host} theme={theme} />
			)}
			<Box position="relative">
				<LinkTitle
					title={effectiveLink.title}
					href={effectiveLink.url}
					layout={layout}
					host={host}
				/>
				<LinkDescription
					description={effectiveLink.description || ""}
					layout={layout}
				/>
				<LinkMetadata
					authors={effectiveLink.authors}
					publishDate={effectiveLink.publishedDate}
					articleTags={effectiveLink.topics || []}
					url={url}
				/>
			</Box>
			{toolbar && layout === "default" && (
				<>
					<Inset mt="4">
						<Separator orientation="horizontal" size="4" my="4" />
					</Inset>
					<Toolbar
						url={effectiveLink.url}
						giftUrl={effectiveLink.giftUrl}
						narrowMutePhrase={effectiveLink.url}
						broadMutePhrase={host}
						instance={instance}
						bsky={bsky}
						type="link"
						isBookmarked={isBookmarked}
						layout={layout}
						subscribed={subscribed}
					/>
				</>
			)}
			{toolbar && layout === "dense" && (
				<ToolDropdown
					url={effectiveLink.url}
					giftUrl={effectiveLink.giftUrl}
					instance={instance}
					bsky={bsky}
					isBookmarked={isBookmarked}
					narrowMutePhrase={effectiveLink.url}
					broadMutePhrase={host}
				/>
			)}
		</WrapperComponent>
	);
};

export default LinkRep;
