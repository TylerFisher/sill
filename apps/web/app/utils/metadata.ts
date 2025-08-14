import ogs, { type SuccessResult } from "open-graph-scraper-lite";
import { z } from "zod";
import type { link } from "@sill/schema";

export async function fetchHtmlViaProxy(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      console.warn(
        `[BROWSER RENDER] Failed to fetch ${url}: ${response.status}`
      );
      return null;
    }

    return response.text();
  } catch (error) {
    console.warn(`[BROWSER RENDER] Error fetching ${url}:`, error);
    return null;
  }
}

const NewsArticleSchema = z.object({
  "@type": z.union([z.literal("NewsArticle"), z.literal("Article")]),
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

const VideoObjectSchema = z.object({
  "@type": z.literal("VideoObject"),
  description: z.string().optional(),
  duration: z.string().optional(),
  embedUrl: z.string().url().optional(),
  name: z.string().optional(),
  uploadDate: z.string().optional(),
  genre: z.string().optional(),
  author: z.string().optional(),
});

type ParsedNewsArticle = z.SafeParseReturnType<
  unknown,
  z.infer<typeof NewsArticleSchema>
>;
type ParsedVideoObject = z.SafeParseReturnType<
  unknown,
  z.infer<typeof VideoObjectSchema>
>;

function parseNewsArticleAuthors(
  parsedNewsArticle: ParsedNewsArticle | null
): string[] | null {
  if (!parsedNewsArticle?.success) return null;

  if (Array.isArray(parsedNewsArticle.data.author)) {
    const authors = parsedNewsArticle.data.author?.map((author) =>
      "name" in author ? author.name : author.mainEntity.name
    );
    return authors;
  }

  return parsedNewsArticle.data.author?.name
    ? [parsedNewsArticle.data.author.name]
    : null;
}

function parseVideoObjectAuthors(
  parsedVideoObject: ParsedVideoObject | null
): string[] | null {
  return parsedVideoObject?.success && parsedVideoObject.data.author
    ? [parsedVideoObject.data.author]
    : null;
}

function getAuthors(
  isYouTubeUrl: boolean,
  parsedNewsArticle: ParsedNewsArticle | null,
  parsedVideoObject: ParsedVideoObject | null
): string[] | null {
  if (isYouTubeUrl) {
    const videoAuthors = parseVideoObjectAuthors(parsedVideoObject);
    if (videoAuthors) return videoAuthors;
  }
  return parseNewsArticleAuthors(parsedNewsArticle);
}

function getPublishedDate(
  isYouTubeUrl: boolean,
  parsedNewsArticle: ParsedNewsArticle | null,
  parsedVideoObject: ParsedVideoObject | null,
  result: SuccessResult["result"]
): string | null {
  if (
    isYouTubeUrl &&
    parsedVideoObject?.success &&
    parsedVideoObject.data.uploadDate
  ) {
    return parsedVideoObject.data.uploadDate;
  }

  return (
    parsedNewsArticle?.data?.datePublished ||
    result.articlePublishedTime ||
    result.articlePublishedDate ||
    null
  );
}

function getTopics(
  isYouTubeUrl: boolean,
  parsedNewsArticle: ParsedNewsArticle | null,
  parsedVideoObject: ParsedVideoObject | null,
  result: SuccessResult["result"]
): string[] {
  // For YouTube videos, prioritize VideoObject genre
  if (
    isYouTubeUrl &&
    parsedVideoObject?.success &&
    parsedVideoObject.data.genre
  ) {
    return [parsedVideoObject.data.genre];
  }

  const keywords = parsedNewsArticle?.data?.keywords;
  if (Array.isArray(keywords)) {
    return keywords;
  }
  if (typeof keywords === "string") {
    return keywords.split(",").map((k) => k.trim());
  }
  return result.articleSection ? [result.articleSection] : [];
}

export async function extractHtmlMetadata(
  html: string
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
      } else if (typeof item === "object" && item !== null) {
        // Check if this item has a @graph property
        if ("@graph" in item && Array.isArray(item["@graph"])) {
          const found = findNewsArticle(item["@graph"]);
          if (found) return found;
        }
        // Check if this item is a NewsArticle or Article
        if (
          "@type" in item &&
          (item["@type"] === "NewsArticle" || item["@type"] === "Article")
        ) {
          return item;
        }
      }
    }
    return null;
  };

  // Recursively search for VideoObject in potentially nested JSON-LD structure
  const findVideoObject = (items: unknown[]): unknown => {
    for (const item of items) {
      if (Array.isArray(item)) {
        const found = findVideoObject(item);
        if (found) return found;
      } else if (typeof item === "object" && item !== null) {
        // Check if this item has a @graph property
        if ("@graph" in item && Array.isArray(item["@graph"])) {
          const found = findVideoObject(item["@graph"]);
          if (found) return found;
        }
        // Check if this item is a VideoObject
        if ("@type" in item && item["@type"] === "VideoObject") {
          return item;
        }
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

  // Check if this is a YouTube URL and parse VideoObject JSON-LD
  const isYouTubeUrl = Boolean(result.ogUrl?.includes("youtube.com"));
  const videoObjectJsonLd =
    isYouTubeUrl && result.jsonLD ? findVideoObject(result.jsonLD) : null;

  const parsedVideoObject = videoObjectJsonLd
    ? VideoObjectSchema.safeParse(videoObjectJsonLd)
    : null;

  if (isYouTubeUrl && parsedVideoObject?.error) {
    console.log("video parsing failed", parsedVideoObject?.error);
  }

  const finalAuthors = getAuthors(
    isYouTubeUrl,
    parsedNewsArticle,
    parsedVideoObject
  );
  const foundDate = getPublishedDate(
    isYouTubeUrl,
    parsedNewsArticle,
    parsedVideoObject,
    result
  );
  const articleTags = getTopics(
    isYouTubeUrl,
    parsedNewsArticle,
    parsedVideoObject,
    result
  );

  const siteName =
    parsedNewsArticle?.data?.publisher?.name || result.ogSiteName || null;

  return {
    title: result.ogTitle || result.twitterTitle || "",
    description: result.ogDescription || result.twitterDescription || null,
    imageUrl: (Array.isArray(result.ogImage) && result.ogImage[0].url) || null,
    metadata: result,
    scraped: true,
    authors: finalAuthors,
    publishedDate: foundDate || null,
    topics: articleTags,
    siteName,
  };
}
