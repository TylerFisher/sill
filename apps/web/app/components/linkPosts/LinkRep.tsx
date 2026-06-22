import { Box, Card, Flex, Inset, Link, Text } from "@radix-ui/themes";
import type { MostRecentLinkPosts, SubscriptionStatus } from "@sill/schema";
import { useState } from "react";
import type { BookmarkWithLinkPosts } from "~/routes/bookmarks";
import { useTheme } from "~/routes/resources/theme-switch";
import { isReviewCard, workTypeLabel } from "~/utils/popfeed";
import styles from "./LinkRep.module.css";
import ToolDropdown from "./ToolDropdown";
import Toolbar from "./Toolbar";
import DisplayHost from "./link/DisplayHost";
import LinkDescription from "./link/LinkDescription";
import LinkImage from "./link/LinkImage";
import LinkMetadata, { LinkTags } from "./link/LinkMetadata";
import LinkTitle from "./link/LinkTitle";
import SpotifyEmbed from "./link/SpotifyEmbed";
import XEmbed from "./link/XEmbed";
import YoutubeEmbed from "./link/YoutubeEmbed";
interface LinkRepProps {
	link: MostRecentLinkPosts["link"];
	instance: string | undefined;
	bsky: string | undefined;
	layout: "dense" | "default";
	toolbar?: boolean;
	isBookmarked: BookmarkWithLinkPosts | undefined;
	subscribed: SubscriptionStatus;
}

interface WrapperComponentProps extends React.PropsWithChildren {
	layout: "default" | "dense";
}

const WrapperComponent = ({ layout, children }: WrapperComponentProps) => {
	if (layout === "dense") {
		return <Box>{children}</Box>;
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

	// AppView is the source of truth for URL metadata; no client-side scrape
	// fallback. `link` is whatever the server returned.
	const effectiveLink = link;

	// When the inline tweet embed fails (e.g. deleted/protected tweet causing
	// react-tweet to throw on a malformed syndication response), fall back to
	// the regular link card with its image — gated here so the negative-margin
	// Inset around the embed isn't rendered for the fallback.
	const [xEmbedFailed, setXEmbedFailed] = useState(false);
	const isTweetHost =
		url.hostname === "twitter.com" || url.hostname === "x.com";
	const showXEmbed = isTweetHost && layout === "default" && !xEmbedFailed;

	// Spotify's iframe player stands in for the link image — it carries the
	// album art, title, and a play control. Self-contained, so the regular
	// LinkImage is suppressed when it's shown (matching the tweet embed).
	const isSpotifyHost = url.hostname === "open.spotify.com";
	const showSpotifyEmbed = isSpotifyHost && layout === "default";

	// Popfeed review cards carry a vertical poster, not a horizontal social card.
	// The 2:1 LinkImage crops/squashes it, so these get a dedicated layout: the
	// poster floated beside the title/metadata. Keyed off the rewritten host
	// (urlItemToLink → popfeed.social/{type}/{id}).
	const isPoster = isReviewCard(effectiveLink) && layout === "default";

	// Release year for the poster's "{type} • {year}" line.
	const posterYear = (() => {
		if (!isPoster || !effectiveLink.publishedDate) return null;
		const d = new Date(effectiveLink.publishedDate);
		return Number.isNaN(d.getTime()) ? null : d.getUTCFullYear();
	})();
	// Primary credit shown above the title (the network for TV, director for a
	// movie, studio for a game) — the AppView byline/authors.
	const posterCredit = effectiveLink.authors?.filter(Boolean).join(", ") || null;

	return (
		<WrapperComponent layout={layout}>
			{isPoster ? (
				<Flex gap="4" align="start" mb="5">
					{effectiveLink.imageUrl && (
						<Box flexShrink="0">
							<Link
								href={effectiveLink.url}
								target="_blank"
								rel="noreferrer"
								aria-label={effectiveLink.title}
							>
								<img
									src={effectiveLink.imageUrl}
									loading="lazy"
									decoding="async"
									alt=""
									className={styles.poster}
								/>
							</Link>
						</Box>
					)}
					<Box flexGrow="1" style={{ minWidth: 0 }}>
						{posterCredit && (
							<Text as="p" size="1" color="gray" mb="1">
								{posterCredit}
							</Text>
						)}
						<LinkTitle
							title={effectiveLink.title || link.url}
							href={effectiveLink.url}
							layout={layout}
							host={host}
							siteName={effectiveLink.siteName}
						/>
						{(effectiveLink.workType || posterYear) && (
							<Text as="p" size="1" color="gray" mt="1">
								{effectiveLink.workType &&
									workTypeLabel(effectiveLink.workType)}
								{effectiveLink.workType && posterYear ? " • " : ""}
								{posterYear}
							</Text>
						)}
						<LinkTags
							articleTags={
								isBookmarked?.bookmarkTags?.map((tag) => tag.tag.name) || []
							}
							url={url}
						/>
					</Box>
				</Flex>
			) : (
				<>
					{!showXEmbed && !showSpotifyEmbed && (
						<LinkImage link={effectiveLink} url={url} layout={layout} />
					)}
					{(url.hostname === "www.youtube.com" ||
						url.hostname === "youtu.be") &&
						layout === "default" && (
							<Inset mb="-4" className={styles.inset}>
								<YoutubeEmbed url={url} />
							</Inset>
						)}
					{/* Full-bleed so the player fills the card edge-to-edge. The
			    iframe drops its own border radius (the outer Card clips the
			    corners) so the maroon reaches the card edges and lines up with
			    the full-bleed toolbar below. */}
					{showSpotifyEmbed && (
						<Inset className={styles.inset}>
							<SpotifyEmbed url={url} />
						</Inset>
					)}
					{showXEmbed && (
						<Inset mt="-5" className={styles.inset}>
							<XEmbed url={url} onError={() => setXEmbedFailed(true)} />
						</Inset>
					)}
					{/* The Spotify player already shows the track title, artist, and
			    source, so the textual link metadata below is redundant — skip it
			    and render only the embed (plus the toolbar). */}
					{!showSpotifyEmbed && (
						<Box position="relative" mb={layout === "default" ? "5" : "0"}>
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
								bookmark={isBookmarked}
								url={url}
								host={host}
								siteName={effectiveLink.siteName}
								layout={layout}
							/>
							<LinkDescription
								description={effectiveLink.description || ""}
								layout={layout}
							/>
							<LinkTags
								articleTags={
									isBookmarked?.bookmarkTags?.map((tag) => tag.tag.name) || []
								}
								url={url}
							/>
						</Box>
					)}
				</>
			)}
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
							isBookmarked={!!isBookmarked}
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
					isBookmarked={!!isBookmarked}
					narrowMutePhrase={effectiveLink.url}
					broadMutePhrase={host}
				/>
			)}
		</WrapperComponent>
	);
};

export default LinkRep;
