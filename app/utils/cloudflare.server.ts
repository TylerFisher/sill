import Cloudflare from "cloudflare";
import { parse } from "node-html-parser";
import { z } from "zod";
import type {
	Thing,
	Graph,
	Article,
	NewsArticle,
	BlogPosting,
	WebPage,
	WebSite,
	BreadcrumbList,
	Person,
	Organization,
} from "schema-dts";

const cloudflare = new Cloudflare({
	apiToken: process.env.CLOUDFLARE_API_TOKEN,
});

// Base schema for all Schema.org types
const BaseSchemaParser = z.object({
	"@type": z.union([z.string(), z.array(z.string())]),
	"@context": z.string().optional(),
	"@id": z.string().optional(),
	name: z.string().optional(),
	description: z.string().optional(),
	url: z.string().optional(),
	image: z.union([z.string(), z.array(z.string())]).optional(),
});

// Thing parser (base type for all Schema.org types)
export const ThingParser = BaseSchemaParser.extend({
	alternateName: z.string().optional(),
	identifier: z.union([z.string(), z.object({}).passthrough()]).optional(),
	mainEntityOfPage: z.string().optional(),
	potentialAction: z.array(z.object({}).passthrough()).optional(),
	sameAs: z.union([z.string(), z.array(z.string())]).optional(),
	subjectOf: z.union([z.string(), z.object({}).passthrough()]).optional(),
	additionalType: z.string().optional(),
	disambiguatingDescription: z.string().optional(),
});

// Person parser
export const PersonParser = ThingParser.extend({
	"@type": z.union([z.literal("Person"), z.array(z.string().refine(arr => arr.includes("Person")))]),
	email: z.string().optional(),
	familyName: z.string().optional(),
	givenName: z.string().optional(),
	jobTitle: z.string().optional(),
	telephone: z.string().optional(),
	address: z.union([z.string(), z.object({}).passthrough()]).optional(),
	birthDate: z.string().optional(),
	gender: z.string().optional(),
	nationality: z.string().optional(),
	worksFor: z.union([z.string(), z.object({}).passthrough()]).optional(),
	knowsAbout: z.union([z.string(), z.array(z.string())]).optional(),
	alumniOf: z.union([z.string(), z.object({}).passthrough()]).optional(),
});

// Organization parser
export const OrganizationParser = ThingParser.extend({
	"@type": z.union([z.literal("Organization"), z.array(z.string().refine(arr => arr.includes("Organization")))]),
	email: z.string().optional(),
	telephone: z.string().optional(),
	address: z.union([z.string(), z.object({}).passthrough()]).optional(),
	foundingDate: z.string().optional(),
	founder: z.union([z.string(), z.object({}).passthrough()]).optional(),
	logo: z.union([z.string(), z.object({}).passthrough()]).optional(),
	contactPoint: z.union([z.object({}).passthrough(), z.array(z.object({}).passthrough())]).optional(),
	location: z.union([z.string(), z.object({}).passthrough()]).optional(),
	member: z.union([z.string(), z.array(z.string()), z.object({}).passthrough()]).optional(),
	numberOfEmployees: z.number().optional(),
	parentOrganization: z.union([z.string(), z.object({}).passthrough()]).optional(),
});

// WebPage parser
export const WebPageParser = ThingParser.extend({
	"@type": z.union([z.literal("WebPage"), z.array(z.string().refine(arr => arr.includes("WebPage")))]),
	breadcrumb: z.union([z.string(), z.object({}).passthrough()]).optional(),
	dateModified: z.string().optional(),
	datePublished: z.string().optional(),
	headline: z.string().optional(),
	inLanguage: z.string().optional(),
	isPartOf: z.union([z.string(), z.object({}).passthrough()]).optional(),
	lastReviewed: z.string().optional(),
	mainContentOfPage: z.union([z.string(), z.object({}).passthrough()]).optional(),
	primaryImageOfPage: z.union([z.string(), z.object({}).passthrough()]).optional(),
	relatedLink: z.union([z.string(), z.array(z.string())]).optional(),
	reviewedBy: z.union([z.string(), z.object({}).passthrough()]).optional(),
	significantLink: z.union([z.string(), z.array(z.string())]).optional(),
	speakable: z.union([z.string(), z.object({}).passthrough()]).optional(),
});

// WebSite parser
export const WebSiteParser = ThingParser.extend({
	"@type": z.union([z.literal("WebSite"), z.array(z.string().refine(arr => arr.includes("WebSite")))]),
	issn: z.string().optional(),
	potentialAction: z.array(z.object({}).passthrough()).optional(),
	publisher: z.union([z.string(), z.object({}).passthrough()]).optional(),
	copyrightHolder: z.union([z.string(), z.object({}).passthrough()]).optional(),
	copyrightYear: z.number().optional(),
	license: z.string().optional(),
	inLanguage: z.string().optional(),
});

// Article parser (base for news articles and blog posts)
export const ArticleParser = ThingParser.extend({
	"@type": z.union([z.literal("Article"), z.array(z.string().refine(arr => arr.includes("Article")))]),
	author: z.union([z.string(), z.object({}).passthrough(), z.array(z.union([z.string(), z.object({}).passthrough()]))]).optional(),
	datePublished: z.string().optional(),
	dateModified: z.string().optional(),
	headline: z.string().optional(),
	publisher: z.union([z.string(), z.object({}).passthrough()]).optional(),
	articleBody: z.string().optional(),
	articleSection: z.string().optional(),
	wordCount: z.number().optional(),
	inLanguage: z.string().optional(),
	editor: z.union([z.string(), z.object({}).passthrough()]).optional(),
	copyrightHolder: z.union([z.string(), z.object({}).passthrough()]).optional(),
	copyrightYear: z.number().optional(),
	keywords: z.union([z.string(), z.array(z.string())]).optional(),
	thumbnailUrl: z.string().optional(),
	commentCount: z.number().optional(),
	speakable: z.union([z.string(), z.object({}).passthrough()]).optional(),
});

// NewsArticle parser
export const NewsArticleParser = ArticleParser.extend({
	"@type": z.union([z.literal("NewsArticle"), z.array(z.string().refine(arr => arr.includes("NewsArticle")))]),
	dateline: z.string().optional(),
	printColumn: z.string().optional(),
	printEdition: z.string().optional(),
	printPage: z.string().optional(),
	printSection: z.string().optional(),
});

// BlogPosting parser
export const BlogPostingParser = ArticleParser.extend({
	"@type": z.union([z.literal("BlogPosting"), z.array(z.string().refine(arr => arr.includes("BlogPosting")))]),
	blogPost: z.union([z.string(), z.object({}).passthrough()]).optional(),
	sharedContent: z.union([z.string(), z.object({}).passthrough()]).optional(),
});

// BreadcrumbList parser
export const BreadcrumbListParser = ThingParser.extend({
	"@type": z.union([z.literal("BreadcrumbList"), z.array(z.string().refine(arr => arr.includes("BreadcrumbList")))]),
	itemListElement: z.array(z.object({
		"@type": z.literal("ListItem").optional(),
		position: z.number().optional(),
		name: z.string().optional(),
		item: z.string().optional(),
	})).optional(),
	numberOfItems: z.number().optional(),
});

// Schema type detection map
const SCHEMA_PARSERS = {
	Thing: ThingParser,
	Person: PersonParser,
	Organization: OrganizationParser,
	WebPage: WebPageParser,
	WebSite: WebSiteParser,
	Article: ArticleParser,
	NewsArticle: NewsArticleParser,
	BlogPosting: BlogPostingParser,
	BreadcrumbList: BreadcrumbListParser,
} as const;

export type SchemaTypeName = keyof typeof SCHEMA_PARSERS;

// Enhanced type detection function using Zod parsers
export function detectSchemaType(data: unknown): SchemaTypeName | null {
	if (!data || typeof data !== "object" || !("@type" in data)) {
		return null;
	}

	const typeValue = (data as Record<string, unknown>)["@type"];
	let types: string[] = [];
	
	if (typeof typeValue === "string") {
		types = [typeValue];
	} else if (Array.isArray(typeValue)) {
		types = typeValue.filter(t => typeof t === "string");
	} else {
		return null;
	}

	// Check most specific types first
	const typeCheckOrder: SchemaTypeName[] = [
		"NewsArticle",
		"BlogPosting", 
		"Article",
		"BreadcrumbList",
		"Person",
		"Organization",
		"WebPage",
		"WebSite",
		"Thing"
	];

	for (const schemaType of typeCheckOrder) {
		if (types.includes(schemaType)) {
			try {
				SCHEMA_PARSERS[schemaType].parse(data);
				return schemaType;
			} catch {
				// If parsing fails, continue to next type
			}
		}
	}

	return null;
}

// Parse and validate schema data with Zod
export function parseSchemaData<T extends SchemaTypeName>(
	data: unknown,
	schemaType: T
): z.infer<typeof SCHEMA_PARSERS[T]> | null {
	try {
		return SCHEMA_PARSERS[schemaType].parse(data);
	} catch {
		return null;
	}
}

function isValidGraph(data: unknown): data is Graph {
	return (
		data !== null &&
		typeof data === "object" &&
		"@graph" in data &&
		Array.isArray(data["@graph"])
	);
}

export interface BrowserRenderOptions {
	url: string;
	timeout?: number;
}

export interface BrowserRenderResult {
	html: string;
	success: boolean;
	error?: string;
}

export type SchemaType =
	| Article
	| NewsArticle
	| BlogPosting
	| WebPage
	| WebSite
	| BreadcrumbList
	| Person
	| Organization
	| Thing;

export interface HtmlMetadata {
	openGraph: Record<string, string>;
	jsonLd: SchemaType[];
	title?: string;
	description?: string;
	articleTags: Record<string, string>;
}

export async function renderPageContent(
	options: BrowserRenderOptions,
): Promise<BrowserRenderResult> {
	try {
		const { url, timeout = 30000 } = options;

		const response = await cloudflare.browserRendering.content.create({
			account_id: process.env.CLOUDFLARE_ACCOUNT_ID!,
			url,
			viewport: {
				width: 1280,
				height: 720,
			},
			actionTimeout: timeout,
			gotoOptions: {
				waitUntil: "networkidle2",
			},
			rejectResourceTypes: ["stylesheet", "image", "font", "media"],
		});

		return {
			html: response,
			success: true,
		};
	} catch (error) {
		console.error(
			"[BROWSER RENDER] Cloudflare browser rendering error:",
			error,
		);
		return {
			html: "",
			success: false,
			error: error instanceof Error ? error.message : "Unknown error occurred",
		};
	}
}

function parseSchemaType(data: unknown): SchemaType | null {
	const detectedType = detectSchemaType(data);
	if (detectedType) {
		const parsed = parseSchemaData(data, detectedType);
		if (parsed) {
			return parsed as SchemaType;
		}
	}
	return null;
}

export async function extractHtmlMetadata(html: string): Promise<HtmlMetadata> {
	const root = parse(html);

	const openGraph: Record<string, string> = {};
	const jsonLd: SchemaType[] = [];
	const articleTags: Record<string, string> = {};

	const metaTags = root.querySelectorAll("meta");

	for (const tag of metaTags) {
		let property = tag.getAttribute("property");
		if (!property) {
			property = tag.getAttribute("name");
		}
		const content = tag.getAttribute("content");

		if (!content) continue;

		if (property?.startsWith("og:")) {
			openGraph[property] = content;
		} else if (property?.startsWith("article:")) {
			articleTags[property] = content;
		}
	}

	const jsonLdScripts = root.querySelectorAll(
		'script[type="application/ld+json"]',
	);
	for (const script of jsonLdScripts) {
		try {
			const rawData = JSON.parse(script.innerHTML || "");
			if (!rawData) continue;

			if (isValidGraph(rawData)) {
				for (const item of rawData["@graph"]) {
					const parsed = parseSchemaType(item);
					if (parsed) {
						jsonLd.push(parsed);
					}
				}
			} else {
				const parsed = parseSchemaType(rawData);
				if (parsed) {
					jsonLd.push(parsed);
				} else {
					console.warn("[BROWSER RENDER] Invalid JSON-LD structure:", rawData);
				}
			}
		} catch (e) {
			console.warn("[BROWSER RENDER] Failed to parse JSON-LD:", e);
		}
	}

	const titleElement = root.querySelector("head title");
	const title = titleElement?.innerHTML || undefined;

	const descriptionMeta = root.querySelector('meta[name="description"]');
	const description = descriptionMeta?.getAttribute("content") || undefined;

	const metadata: HtmlMetadata = {
		openGraph,
		jsonLd,
		title,
		description,
		articleTags,
	};

	return metadata;
}
