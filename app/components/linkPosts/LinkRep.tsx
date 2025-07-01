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

	return (
		<WrapperComponent layout={layout}>
			<LinkImage
				link={link}
				url={url}
				host={host}
				layout={layout}
				theme={theme}
			/>
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
			<Box position="relative">
				<LinkTitle
					title={link.title}
					href={link.url}
					layout={layout}
					host={host}
				/>
				<LinkDescription description={link.description || ""} layout={layout} />
				<LinkMetadata
					authors={link.authors}
					publishDate={link.publishedDate}
					articleTags={link.topics || []}
					url={url}
				/>
			</Box>
			{toolbar && layout === "default" && (
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
						layout={layout}
						subscribed={subscribed}
					/>
				</>
			)}
			{toolbar && layout === "dense" && (
				<ToolDropdown
					url={link.url}
					giftUrl={link.giftUrl}
					instance={instance}
					bsky={bsky}
					isBookmarked={isBookmarked}
					narrowMutePhrase={link.url}
					broadMutePhrase={host}
				/>
			)}
		</WrapperComponent>
	);
};

export default LinkRep;
