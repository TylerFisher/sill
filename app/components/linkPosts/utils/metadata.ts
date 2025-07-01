import type { MostRecentLinkPosts } from "~/utils/links.server";
import type { ExtractedSchemaData } from "~/utils/cloudflare.server";

export const getEnhancedMetadata = (link: MostRecentLinkPosts["link"]) => {
	if (!link?.metadata) {
		return null;
	}

	// Use processed schema data if available, otherwise fall back to raw JSON-LD
	if (
		link.metadata.processedSchemas &&
		link.metadata.processedSchemas.length > 0
	) {
		const schemas = link.metadata.processedSchemas;

		// Prioritize schema types by preference
		const typePreference = [
			"NewsArticle",
			"Article",
			"WebPage",
			"Event",
			"Product",
			"Person",
			"Organization",
			"LocalBusiness",
		];

		// Find the most preferred schema type available
		let primarySchema = schemas[0]; // Default to first if no preferred type found

		for (const preferredType of typePreference) {
			const found = schemas.find((schema) => schema.type === preferredType);
			if (found) {
				primarySchema = found;
				break;
			}
		}

		return {
			schemas,
			primarySchema,
		};
	}

	return null;
};

export const getSchemaBasedTitle = (
	schema: ExtractedSchemaData,
	link: MostRecentLinkPosts["link"],
) => {
	// Use schema-specific title logic
	let title = "";
	switch (schema.type) {
		case "Article":
		case "NewsArticle":
			title = schema.headline || schema.title || "";
			break;
		default:
			title = schema.title || "";
			break;
	}

	// Fall back to Open Graph title if schema doesn't have one
	if (!title && link?.metadata?.openGraph) {
		title = link.metadata.openGraph["og:title"] || "";
	}

	// Final fallback to link title
	return title || link?.title || "";
};

export const truncateDescription = (description: string, maxLength = 300) => {
	if (description.length <= maxLength) return description;
	return `${description.slice(0, maxLength).trim()}…`;
};

export const getSchemaBasedDescription = (
	schema: ExtractedSchemaData,
	link: MostRecentLinkPosts["link"],
) => {
	// Use schema-specific description logic
	let description = "";
	switch (schema.type) {
		case "Article":
		case "NewsArticle": {
			description = schema.description || "";
			break;
		}

		case "Event": {
			// For events, show date and location
			const eventInfo = [];
			if (schema.startDate) {
				const date = new Date(schema.startDate).toLocaleDateString();
				eventInfo.push(date);
			}
			if (schema.location) eventInfo.push(schema.location);
			const eventPrefix =
				eventInfo.length > 0 ? `${eventInfo.join(" • ")} • ` : "";
			description = eventPrefix + (schema.description || "");
			break;
		}

		case "Product": {
			// For products, show brand if available
			const productPrefix = schema.brand ? `${schema.brand} • ` : "";
			description = productPrefix + (schema.description || "");
			break;
		}

		case "Organization":
		case "LocalBusiness": {
			// For organizations, show contact info if description is missing
			if (!schema.description) {
				const orgInfo = [];
				if (schema.address) orgInfo.push(schema.address);
				if (schema.telephone) orgInfo.push(schema.telephone);
				description = orgInfo.join(" • ");
			} else {
				description = schema.description;
			}
			break;
		}

		default:
			description = schema.description || "";
			break;
	}

	// Fall back to Open Graph description if schema doesn't have one
	if (!description && link?.metadata?.openGraph) {
		description = link.metadata.openGraph["og:description"] || "";
	}

	// Final fallback to link description
	const finalDescription = description || link?.description || "";

	return truncateDescription(finalDescription);
};

export const getPublishDate = (
	schema: ExtractedSchemaData | undefined,
	link: MostRecentLinkPosts["link"],
) => {
	// Try schema data first
	if (schema?.datePublished) {
		try {
			const date = new Date(schema.datePublished);
			return Number.isNaN(date.getTime()) ? null : date;
		} catch {
			// Continue to fallbacks
		}
	}

	// Fall back to article tags
	if (link?.metadata?.articleTags) {
		const publishedTime = link.metadata.articleTags["article:published_time"];
		if (publishedTime) {
			try {
				const date = new Date(publishedTime);
				return Number.isNaN(date.getTime()) ? null : date;
			} catch {
				// Continue to next fallback
			}
		}
	}

	// Fall back to Open Graph
	if (link?.metadata?.openGraph) {
		const publishedTime = link.metadata.openGraph["article:published_time"];
		if (publishedTime) {
			try {
				const date = new Date(publishedTime);
				return Number.isNaN(date.getTime()) ? null : date;
			} catch {
				// Final fallback failed
			}
		}
	}

	return null;
};

export const getAuthor = (
	schema: ExtractedSchemaData | undefined,
	link: MostRecentLinkPosts["link"],
) => {
	// Try schema data first - check for multiple authors/creators
	if (schema?.authors && schema.authors.length > 0) {
		return schema.authors.length > 1
			? `${schema.authors.slice(0, -1).join(", ")} and ${schema.authors[schema.authors.length - 1]}`
			: schema.authors[0];
	}
	if (schema?.author) {
		return schema.author;
	}
	if (schema?.creators && schema.creators.length > 0) {
		return schema.creators.length > 1
			? `${schema.creators.slice(0, -1).join(", ")} and ${schema.creators[schema.creators.length - 1]}`
			: schema.creators[0];
	}
	if (schema?.creator) {
		return schema.creator;
	}

	// Fall back to article tags
	if (link?.metadata?.articleTags) {
		const author = link.metadata.articleTags["article:author"];
		if (author) return author;
	}

	// Fall back to Open Graph
	if (link?.metadata?.openGraph) {
		const author = link.metadata.openGraph["article:author"];
		if (author) return author;
	}

	return null;
};

export const getOrganizationName = (
	enhancedMetadata: { schemas: ExtractedSchemaData[] } | null,
	link: MostRecentLinkPosts["link"],
) => {
	// First try to find publisher info from article schema
	if (enhancedMetadata?.schemas) {
		for (const schema of enhancedMetadata.schemas) {
			if (schema.type === "Article" || schema.type === "NewsArticle") {
				if (schema.publisher) return schema.publisher;
			}
		}

		// Then look for Organization schema
		for (const schema of enhancedMetadata.schemas) {
			if (schema.type === "Organization" || schema.type === "LocalBusiness") {
				if (schema.title) return schema.title;
			}
		}
	}

	// Fall back to Open Graph site name
	if (link?.metadata?.openGraph) {
		const siteName = link.metadata.openGraph["og:site_name"];
		if (siteName) return siteName;
	}

	return null;
};

export const getArticleTags = (link: MostRecentLinkPosts["link"]) => {
	if (!link?.metadata?.articleTags) return [];

	const tags = [];
	for (const [key, value] of Object.entries(link.metadata.articleTags)) {
		if (key.startsWith("article:tag") && value) {
			tags.push(value);
		}
	}

	return tags;
};