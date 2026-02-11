import ogs, { type SuccessResult } from "open-graph-scraper-lite";
import { z } from "zod";
import { db, link, linkPostDenormalized } from "@sill/schema";
import { and, count, eq, gte, ilike, not, sql } from "drizzle-orm";
import { renderPageContent } from "./cloudflare.js";

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
      // Graph-style @id references
      z.array(z.object({ "@id": z.string() })),
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
  publisher: z
    .union([
      z.object({ name: z.string() }),
      // Graph-style @id reference
      z.object({ "@id": z.string() }),
    ])
    .optional(),
});

// Type for entities in @graph that may be referenced by @id
type GraphEntity = { "@id"?: string; "@type"?: string; name?: string };

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
  parsedNewsArticle: ParsedNewsArticle | null,
  graphEntities: Map<string, GraphEntity>
): string[] | null {
  if (!parsedNewsArticle?.success) return null;

  if (Array.isArray(parsedNewsArticle.data.author)) {
    const authors = parsedNewsArticle.data.author
      .map((author) => {
        if ("name" in author) {
          return author.name;
        }
        if ("mainEntity" in author) {
          return author.mainEntity.name;
        }
        // Handle @id reference - resolve from graph
        if ("@id" in author) {
          const resolved = graphEntities.get(author["@id"]);
          if (resolved?.name) {
            return resolved.name;
          }
        }
        return null;
      })
      .filter((name): name is string => name !== null);
    return authors.length > 0 ? authors : null;
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
  parsedVideoObject: ParsedVideoObject | null,
  graphEntities: Map<string, GraphEntity>
): string[] | null {
  if (isYouTubeUrl) {
    const videoAuthors = parseVideoObjectAuthors(parsedVideoObject);
    if (videoAuthors) return videoAuthors;
  }
  return parseNewsArticleAuthors(parsedNewsArticle, graphEntities);
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
  let metadata: Awaited<ReturnType<typeof ogs>>;
  try {
    metadata = await ogs({
      html,
    });
  } catch (error) {
    console.error("[METADATA] Failed to parse HTML metadata:", error);
    return null;
  }

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

  // Build a map of @id -> entity for resolving graph references
  const buildGraphEntities = (items: unknown[]): Map<string, GraphEntity> => {
    const entities = new Map<string, GraphEntity>();
    for (const item of items) {
      if (Array.isArray(item)) {
        for (const [key, value] of buildGraphEntities(item)) {
          entities.set(key, value);
        }
      } else if (typeof item === "object" && item !== null) {
        if ("@graph" in item && Array.isArray(item["@graph"])) {
          for (const [key, value] of buildGraphEntities(item["@graph"])) {
            entities.set(key, value);
          }
        }
        // Add any entity with an @id to the map
        if ("@id" in item && typeof item["@id"] === "string") {
          entities.set(item["@id"], item as GraphEntity);
        }
      }
    }
    return entities;
  };

  const graphEntities = result.jsonLD
    ? buildGraphEntities(result.jsonLD)
    : new Map<string, GraphEntity>();

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
    parsedVideoObject,
    graphEntities
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

  // Resolve publisher name - either inline or via @id reference
  let siteName: string | null = null;
  const publisher = parsedNewsArticle?.data?.publisher;
  if (publisher) {
    if ("name" in publisher) {
      siteName = publisher.name;
    } else if ("@id" in publisher) {
      const resolved = graphEntities.get(publisher["@id"]);
      if (resolved?.name) {
        siteName = resolved.name;
      }
    }
  }
  if (!siteName) {
    siteName = result.ogSiteName || null;
  }

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

/**
 * Processes a URL to fetch and store metadata.
 * First tries Cloudflare browser rendering, falls back to direct fetch if that fails.
 * Updates the link record in the database with extracted metadata.
 */
export async function processUrl(url: string): Promise<void> {
  const result = await renderPageContent({ url });
  if (result.success) {
    const metadata = await extractHtmlMetadata(result.html);
    if (metadata) {
      await db.update(link).set(metadata).where(eq(link.url, url));
      console.log(
        `[BROWSER RENDER] updated metadata from cloudflare for ${url}`,
      );
    } else {
      const html = await fetchHtmlViaProxy(url);
      if (html) {
        const metadata = await extractHtmlMetadata(result.html);
        if (metadata) {
          await db.update(link).set(metadata).where(eq(link.url, url));
          console.log(
            `[BROWSER RENDER] updated metadata from proxy for ${url}`,
          );
        } else {
          await db
            .update(link)
            .set({ scraped: true })
            .where(eq(link.url, url));
          console.log(`[BROWSER RENDER] no metadata found for ${url}`);
        }
      } else {
        await db
          .update(link)
          .set({ scraped: true })
          .where(eq(link.url, url));
      }
    }
  } else {
    console.log("[BROWSER RENDER] error", url, result.error);
    await db
      .update(link)
      .set({ scraped: true })
      .where(eq(link.url, url));
  }
}

/**
 * Finds URLs with high activity in the last 24 hours that haven't been scraped yet.
 * Returns links that have been shared at least `threshold` times and excludes PDFs.
 * @param threshold - Minimum number of shares required (default: 5, can be overridden via SCRAPE_SHARE_THRESHOLD env var)
 * @returns Array of unique URLs that meet the criteria
 */
export async function getHighActivityUrls(
  threshold?: number
): Promise<string[]> {
  const shareThreshold =
    threshold ??
    (process.env.SCRAPE_SHARE_THRESHOLD
      ? Number.parseInt(process.env.SCRAPE_SHARE_THRESHOLD)
      : 5);

  const linkPostCounts = await db
    .select({
      linkUrl: linkPostDenormalized.linkUrl,
      postCount: count(linkPostDenormalized.id).as("postCount"),
    })
    .from(linkPostDenormalized)
    .innerJoin(link, eq(linkPostDenormalized.linkUrl, link.url))
    .where(
      and(
        gte(linkPostDenormalized.postDate, sql`NOW() - INTERVAL '1 day'`),
        eq(link.scraped, false),
        not(ilike(link.url, "%.pdf"))
      )
    )
    .groupBy(linkPostDenormalized.linkUrl)
    .having(sql`COUNT(${linkPostDenormalized.id}) >= ${shareThreshold}`);

  return [...new Set(linkPostCounts.map((lpc) => lpc.linkUrl))];
}
