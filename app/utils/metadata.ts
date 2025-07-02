import ogs from "open-graph-scraper-lite";
import type { link } from "~/drizzle/schema.server";
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
	keywords: z.union([z.string(), z.array(z.string()).optional()]),
	publisher: z.object({ name: z.string() }).optional(),
});

export async function extractHtmlMetadata(
	html: string,
): Promise<null | Omit<typeof link.$inferSelect, "id" | "url" | "giftUrl">> {
	const metadata = await ogs({
		html,
	});

	if (metadata.error) {
		console.error("ERROR", metadata.result);
		return null;
	}

	if (!metadata.result.ogUrl) {
		return null;
	}

	const result = metadata.result;

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

	const newsArticleJsonLd = result.jsonLD
		? findNewsArticle(result.jsonLD)
		: null;

	const parsedNewsArticle = newsArticleJsonLd
		? NewsArticleSchema.safeParse(newsArticleJsonLd)
		: null;

	const newsArticleAuthors = parsedNewsArticle?.success
		? Array.isArray(parsedNewsArticle.data.author)
			? (() => {
					const authors = parsedNewsArticle.data.author?.map((author) =>
						"name" in author ? author.name : author.mainEntity.name,
					);
					return authors;
				})()
			: parsedNewsArticle.data.author?.name
				? [parsedNewsArticle.data.author?.name]
				: null
		: null;

	const foundDate =
		parsedNewsArticle?.data?.datePublished ||
		result.articlePublishedTime ||
		result.articlePublishedDate;

	const articleTags = (() => {
		const keywords = parsedNewsArticle?.data?.keywords;
		if (Array.isArray(keywords)) {
			return keywords;
		}
		if (typeof keywords === "string") {
			return keywords.split(",").map((k) => k.trim());
		}
		return result.articleSection ? [result.articleSection] : [];
	})();

	const siteName =
		parsedNewsArticle?.data?.publisher?.name || result.ogSiteName || null;

	return {
		title: result.ogTitle || result.twitterTitle || "",
		description: result.ogDescription || result.twitterDescription || null,
		imageUrl: (Array.isArray(result.ogImage) && result.ogImage[0].url) || null,
		metadata: result,
		scraped: true,
		authors: newsArticleAuthors,
		publishedDate: foundDate ? new Date(foundDate) : null,
		topics: articleTags,
		siteName,
	};
}
