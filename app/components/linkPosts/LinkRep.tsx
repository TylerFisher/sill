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
import { z } from "zod";

const NewsArticleSchema = z.object({
	"@type": z.literal("NewsArticle"),
	author: z
		.union([
			z.object({ name: z.string() }),
			z.array(z.object({ name: z.string() })),
			z.array(z.object({ mainEntity: z.object({ name: z.string() }) })),
		])
		.optional(),
	datePublished: z.string().optional(),
	headline: z.string().optional(),
	articleBody: z.string().optional(),
	articleSection: z.union([z.array(z.string()), z.string().optional()]),
	backstory: z.string().optional(),
	wordCount: z.number().optional(),
	name: z.string().optional(),
	description: z.string().optional(),
	url: z.string().optional(),
	image: z
		.union([
			z.string(),
			z.object({ url: z.string() }),
			z.array(z.union([z.string(), z.object({ url: z.string() })])),
		])
		.optional(),
});

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

	// Recursively search for NewsArticle in potentially nested JSON-LD structure
	const findNewsArticle = (items: unknown[]): unknown => {
		for (const item of items) {
			if (Array.isArray(item)) {
				const found = findNewsArticle(item);
				if (found) return found;
			} else if (
				typeof item === "object" &&
				item !== null &&
				"@type" in item &&
				item["@type"] === "NewsArticle"
			) {
				return item;
			}
		}
		return null;
	};

	const newsArticleJsonLd = link.metadata?.jsonLD
		? findNewsArticle(link.metadata.jsonLD)
		: null;

	const parsedNewsArticle = newsArticleJsonLd
		? NewsArticleSchema.safeParse(newsArticleJsonLd)
		: null;

	if (newsArticleJsonLd && !parsedNewsArticle?.success) {
		console.log("NewsArticle schema parse error:", parsedNewsArticle?.error);
	}

	const newsArticleAuthors = parsedNewsArticle?.success
		? Array.isArray(parsedNewsArticle.data.author)
			? (() => {
					const authors = parsedNewsArticle.data.author?.map((author) =>
						"name" in author ? author.name : author.mainEntity.name,
					);
					return authors?.length === 2
						? authors.join(" and ")
						: authors?.join(", ");
				})()
			: parsedNewsArticle.data.author?.name
		: null;

	const validMetadata = link.metadata?.ogUrl ? link.metadata : null;
	const displayHost = validMetadata?.ogSiteName || host;
	const displayTitle = validMetadata?.ogTitle || link.title || link.url;
	const displayDescription =
		validMetadata?.ogDescription || link.description || "";
	const author =
		newsArticleAuthors ||
		validMetadata?.ogArticleAuthor ||
		validMetadata?.author ||
		validMetadata?.articleAuthor ||
		"";
	const publishDate =
		parsedNewsArticle?.data?.datePublished ||
		validMetadata?.articlePublishedTime ||
		validMetadata?.articlePublishedDate;
	const articleTags =
		validMetadata?.articleTag || validMetadata?.articleSection || null;

	return (
		<WrapperComponent layout={layout}>
			<LinkImage
				link={link}
				url={url}
				host={host}
				displayHost={displayHost}
				displayTitle={displayTitle}
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
					title={displayTitle}
					href={link.url}
					layout={layout}
					host={host}
				/>
				<LinkDescription description={displayDescription} layout={layout} />
				<LinkMetadata
					author={author}
					publishDate={publishDate ? new Date(publishDate) : null}
					articleTags={articleTags ? [articleTags] : []}
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
