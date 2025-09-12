import { Box, Card, Inset } from "@radix-ui/themes";
import { useClientMetadata } from "~/hooks/useClientMetadata";
import { useTheme } from "~/routes/resources/theme-switch";
import type { MostRecentLinkPosts, SubscriptionStatus } from "@sill/schema";
import styles from "./LinkRep.module.css";
import ToolDropdown from "./ToolDropdown";
import Toolbar from "./Toolbar";
import DisplayHost from "./link/DisplayHost";
import LinkDescription from "./link/LinkDescription";
import LinkImage from "./link/LinkImage";
import LinkMetadata from "./link/LinkMetadata";
import LinkTitle from "./link/LinkTitle";
import XEmbed from "./link/XEmbed";
import YoutubeEmbed from "./link/YoutubeEmbed";
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
				title: clientMetadata.title || link.title || link.url,
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
			<Box position="relative" mb="5">
				{layout === "default" && (
					<DisplayHost
						link={effectiveLink}
						host={host}
						theme={theme}
						image={!!effectiveLink.imageUrl}
					/>
				)}
				<LinkTitle
					title={effectiveLink.title || link.url}
					href={effectiveLink.url}
					layout={layout}
					host={host}
					siteName={effectiveLink.siteName}
				/>
				<LinkMetadata
					authors={effectiveLink.authors}
					publishDate={effectiveLink.publishedDate}
					articleTags={effectiveLink.topics || []}
					url={url}
					host={host}
					siteName={effectiveLink.siteName}
					layout={layout}
				/>
				<LinkDescription
					description={effectiveLink.description || ""}
					layout={layout}
				/>
				{/* <LinkTags articleTags={effectiveLink.topics || []} url={url} /> */}
			</Box>
			{toolbar && layout === "default" && (
				<Inset
					mt="4"
					style={{
						borderRadius: 0,
					}}
				>
					<Box
						py="2"
						style={{
							backgroundColor:
								theme === "dark" ? "var(--gray-3)" : "var(--gray-2)",
							borderRadius: "0",
						}}
						px="4"
					>
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
					</Box>
				</Inset>
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
