import Cloudflare from "cloudflare";
import { parse } from "node-html-parser";
import { z } from "zod";
import type {
	WithContext,
	Thing,
	Graph,
	NewsArticle,
	Article,
	WebPage,
	Organization,
	Person,
	Product,
	LocalBusiness,
	Event,
} from "schema-dts";

const cloudflare = new Cloudflare({
	apiToken: process.env.CLOUDFLARE_API_TOKEN,
});

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

// Type-specific parsers
export const ArticleParser = ThingParser.extend({
	"@type": z.union([
		z.literal("Article"),
		z.literal("NewsArticle"),
		z
			.array(z.string())
			.refine(
				(types) => types.includes("Article") || types.includes("NewsArticle"),
			),
	]),
	headline: z.string().optional(),
	author: z
		.union([
			z.string(),
			z
				.object({
					"@type": z.literal("Person").optional(),
					name: z.string().optional(),
				})
				.passthrough(),
		])
		.optional(),
	datePublished: z.string().optional(),
	dateModified: z.string().optional(),
	publisher: z.union([z.string(), z.object({}).passthrough()]).optional(),
	articleBody: z.string().optional(),
	articleSection: z.string().optional(),
	wordCount: z.number().optional(),
});

export const WebPageParser = ThingParser.extend({
	"@type": z.union([
		z.literal("WebPage"),
		z.array(z.string()).refine((types) => types.includes("WebPage")),
	]),
	breadcrumb: z.union([z.string(), z.object({}).passthrough()]).optional(),
	lastReviewed: z.string().optional(),
	mainContentOfPage: z
		.union([z.string(), z.object({}).passthrough()])
		.optional(),
	primaryImageOfPage: z
		.union([z.string(), z.object({}).passthrough()])
		.optional(),
	relatedLink: z.union([z.string(), z.array(z.string())]).optional(),
	significantLink: z.union([z.string(), z.array(z.string())]).optional(),
});

export const OrganizationParser = ThingParser.extend({
	"@type": z.union([
		z.literal("Organization"),
		z.literal("LocalBusiness"),
		z
			.array(z.string())
			.refine(
				(types) =>
					types.includes("Organization") || types.includes("LocalBusiness"),
			),
	]),
	address: z.union([z.string(), z.object({}).passthrough()]).optional(),
	contactPoint: z.union([z.string(), z.object({}).passthrough()]).optional(),
	email: z.string().optional(),
	telephone: z.string().optional(),
	founder: z.union([z.string(), z.object({}).passthrough()]).optional(),
	foundingDate: z.string().optional(),
	legalName: z.string().optional(),
	logo: z.union([z.string(), z.object({}).passthrough()]).optional(),
	numberOfEmployees: z.number().optional(),
});

export const PersonParser = ThingParser.extend({
	"@type": z.union([
		z.literal("Person"),
		z.array(z.string()).refine((types) => types.includes("Person")),
	]),
	additionalName: z.string().optional(),
	address: z.union([z.string(), z.object({}).passthrough()]).optional(),
	birthDate: z.string().optional(),
	email: z.string().optional(),
	familyName: z.string().optional(),
	givenName: z.string().optional(),
	jobTitle: z.string().optional(),
	nationality: z.string().optional(),
	telephone: z.string().optional(),
	worksFor: z.union([z.string(), z.object({}).passthrough()]).optional(),
});

export const ProductParser = ThingParser.extend({
	"@type": z.union([
		z.literal("Product"),
		z.array(z.string()).refine((types) => types.includes("Product")),
	]),
	brand: z.union([z.string(), z.object({}).passthrough()]).optional(),
	category: z.string().optional(),
	manufacturer: z.union([z.string(), z.object({}).passthrough()]).optional(),
	model: z.string().optional(),
	offers: z.union([z.string(), z.object({}).passthrough()]).optional(),
	productID: z.string().optional(),
	review: z.union([z.string(), z.object({}).passthrough()]).optional(),
	sku: z.string().optional(),
});

export const EventParser = ThingParser.extend({
	"@type": z.union([
		z.literal("Event"),
		z.array(z.string()).refine((types) => types.includes("Event")),
	]),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	location: z.union([z.string(), z.object({}).passthrough()]).optional(),
	organizer: z.union([z.string(), z.object({}).passthrough()]).optional(),
	performer: z.union([z.string(), z.object({}).passthrough()]).optional(),
	eventStatus: z.string().optional(),
	eventAttendanceMode: z.string().optional(),
});

function isValidGraph(data: unknown): data is Graph {
	return (
		data !== null &&
		typeof data === "object" &&
		"@graph" in data &&
		Array.isArray(data["@graph"])
	);
}

function isValidThing(data: unknown): data is WithContext<Thing> {
	return data !== null && typeof data === "object" && "@type" in data;
}

// Helper function to safely extract string values from schema-dts types
function extractStringValue(value: unknown): string | undefined {
	if (typeof value === "string") return value;
	if (
		Array.isArray(value) &&
		value.length > 0 &&
		typeof value[0] === "string"
	) {
		return value[0];
	}
	if (
		value &&
		typeof value === "object" &&
		"name" in value &&
		typeof value.name === "string"
	) {
		return value.name;
	}
	return undefined;
}

// Helper function to extract author names from author/creator fields
function extractAuthorNames(value: unknown): string[] {
	const authors: string[] = [];

	if (typeof value === "string") {
		authors.push(value);
	} else if (Array.isArray(value)) {
		for (const item of value) {
			if (typeof item === "string") {
				authors.push(item);
			} else if (item && typeof item === "object") {
				// Try to handle as Person object
				if (isPerson(item)) {
					const personData = handlePerson(item as WithContext<Person>);
					if (personData.title) {
						authors.push(personData.title);
					}
				} else if ("name" in item && typeof item.name === "string") {
					authors.push(item.name);
				}
			}
		}
	} else if (value && typeof value === "object") {
		// Single Person object
		if (isPerson(value)) {
			const personData = handlePerson(value as WithContext<Person>);
			if (personData.title) {
				authors.push(personData.title);
			}
		} else if ("name" in value && typeof value.name === "string") {
			authors.push(value.name);
		}
	}

	return authors;
}

// Helper function to safely get @type from schema data
function getSchemaTypes(data: unknown): string[] {
	if (!data || typeof data !== "object" || !("@type" in data)) return [];
	const obj = data as Record<string, unknown>;
	const types = obj["@type"];
	return Array.isArray(types) ? types : [types as string];
}

// Enhanced type guards for specific Schema.org types
function hasSchemaType(data: WithContext<Thing>, typeName: string): boolean {
	const types = getSchemaTypes(data);
	return types.includes(typeName);
}

function isNewsArticle(data: unknown): data is WithContext<NewsArticle> {
	return isValidThing(data) && hasSchemaType(data, "NewsArticle");
}

function isArticle(data: unknown): data is WithContext<Article> {
	return (
		isValidThing(data) &&
		(hasSchemaType(data, "Article") || hasSchemaType(data, "NewsArticle"))
	);
}

function isWebPage(data: unknown): data is WithContext<WebPage> {
	return isValidThing(data) && hasSchemaType(data, "WebPage");
}

function isOrganization(data: unknown): data is WithContext<Organization> {
	return (
		isValidThing(data) &&
		(hasSchemaType(data, "Organization") ||
			hasSchemaType(data, "LocalBusiness"))
	);
}

function isPerson(data: unknown): data is WithContext<Person> {
	return isValidThing(data) && hasSchemaType(data, "Person");
}

function isProduct(data: unknown): data is WithContext<Product> {
	return isValidThing(data) && hasSchemaType(data, "Product");
}

function isLocalBusiness(data: unknown): data is WithContext<LocalBusiness> {
	return isValidThing(data) && hasSchemaType(data, "LocalBusiness");
}

function isEvent(data: unknown): data is WithContext<Event> {
	return isValidThing(data) && hasSchemaType(data, "Event");
}

// Type detection and processing system
export type SchemaTypeHandler<T = WithContext<Thing>> = (
	data: T,
) => ExtractedSchemaData;

export interface ExtractedSchemaData {
	type: string;
	title?: string;
	description?: string;
	url?: string;
	image?: string;
	author?: string;
	authors?: string[];
	creator?: string;
	creators?: string[];
	datePublished?: string;
	dateModified?: string;
	// Type-specific properties
	headline?: string;
	articleBody?: string;
	publisher?: string;
	location?: string;
	startDate?: string;
	endDate?: string;
	price?: string;
	brand?: string;
	email?: string;
	telephone?: string;
	address?: string;
}

// Handler functions for each type
function handleArticle(data: WithContext<Article>): ExtractedSchemaData {
	const result = ArticleParser.safeParse(data);
	const article = result.success
		? result.data
		: (data as unknown as Record<string, unknown>);

	// Extract authors and creators using the helper function
	const authors = extractAuthorNames(article.author);
	const creators = extractAuthorNames(
		(article as Record<string, unknown>).creator,
	);

	return {
		type: "Article",
		title:
			extractStringValue(article.headline) || extractStringValue(article.name),
		description: extractStringValue(article.description),
		url: extractStringValue(article.url),
		image: extractStringValue(article.image),
		author: authors.length > 0 ? authors[0] : undefined,
		authors: authors.length > 0 ? authors : undefined,
		creator: creators.length > 0 ? creators[0] : undefined,
		creators: creators.length > 0 ? creators : undefined,
		datePublished: extractStringValue(article.datePublished),
		dateModified: extractStringValue(article.dateModified),
		headline: extractStringValue(article.headline),
		articleBody: extractStringValue(article.articleBody),
		publisher: extractStringValue(article.publisher),
	};
}

function handleWebPage(data: WithContext<WebPage>): ExtractedSchemaData {
	const result = WebPageParser.safeParse(data);
	const page = result.success
		? result.data
		: (data as unknown as Record<string, unknown>);

	return {
		type: "WebPage",
		title: extractStringValue(page.name),
		description: extractStringValue(page.description),
		url: extractStringValue(page.url),
		image: extractStringValue(page.image),
	};
}

function handleOrganization(
	data: WithContext<Organization>,
): ExtractedSchemaData {
	const result = OrganizationParser.safeParse(data);
	const org = result.success
		? result.data
		: (data as unknown as Record<string, unknown>);

	return {
		type: "Organization",
		title: extractStringValue(org.legalName) || extractStringValue(org.name),
		description: extractStringValue(org.description),
		url: extractStringValue(org.url),
		image: extractStringValue(org.logo),
		email: extractStringValue(org.email),
		telephone: extractStringValue(org.telephone),
		address: extractStringValue(org.address),
	};
}

function handlePerson(data: WithContext<Person>): ExtractedSchemaData {
	const result = PersonParser.safeParse(data);
	const person = result.success
		? result.data
		: (data as unknown as Record<string, unknown>);

	const givenName = extractStringValue(person.givenName);
	const familyName = extractStringValue(person.familyName);
	const fullName =
		givenName && familyName
			? `${givenName} ${familyName}`
			: extractStringValue(person.name);

	return {
		type: "Person",
		title: fullName,
		description: extractStringValue(person.description),
		url: extractStringValue(person.url),
		image: extractStringValue(person.image),
		email: extractStringValue(person.email),
		telephone: extractStringValue(person.telephone),
	};
}

function handleProduct(data: WithContext<Product>): ExtractedSchemaData {
	const result = ProductParser.safeParse(data);
	const product = result.success
		? result.data
		: (data as unknown as Record<string, unknown>);

	return {
		type: "Product",
		title: extractStringValue(product.name),
		description: extractStringValue(product.description),
		url: extractStringValue(product.url),
		image: extractStringValue(product.image),
		brand: extractStringValue(product.brand),
	};
}

function handleEvent(data: WithContext<Event>): ExtractedSchemaData {
	const result = EventParser.safeParse(data);
	const event = result.success
		? result.data
		: (data as unknown as Record<string, unknown>);

	return {
		type: "Event",
		title: extractStringValue(event.name),
		description: extractStringValue(event.description),
		url: extractStringValue(event.url),
		image: extractStringValue(event.image),
		startDate: extractStringValue(event.startDate),
		endDate: extractStringValue(event.endDate),
		location: extractStringValue(event.location),
	};
}

function handleGenericThing(data: WithContext<Thing>): ExtractedSchemaData {
	const result = ThingParser.safeParse(data);
	const thing = result.success
		? result.data
		: (data as unknown as Record<string, unknown>);

	const types = getSchemaTypes(thing);
	const creators = extractAuthorNames(
		(thing as Record<string, unknown>).creator,
	);

	return {
		type: types[0] || "Thing",
		title: extractStringValue(thing.name),
		description: extractStringValue(thing.description),
		url: extractStringValue(thing.url),
		image: extractStringValue(thing.image),
		creator: creators.length > 0 ? creators[0] : undefined,
		creators: creators.length > 0 ? creators : undefined,
	};
}

// Type detection router
export function detectAndProcessSchema(
	data: WithContext<Thing>,
): ExtractedSchemaData {
	// Process in order of specificity (most specific first)
	if (isNewsArticle(data) || isArticle(data)) {
		return handleArticle(data as WithContext<Article>);
	}

	if (isEvent(data)) {
		return handleEvent(data as WithContext<Event>);
	}

	if (isProduct(data)) {
		return handleProduct(data as WithContext<Product>);
	}

	if (isPerson(data)) {
		return handlePerson(data as WithContext<Person>);
	}

	if (isLocalBusiness(data) || isOrganization(data)) {
		return handleOrganization(data as WithContext<Organization>);
	}

	if (isWebPage(data)) {
		return handleWebPage(data as WithContext<WebPage>);
	}

	// Fallback to generic Thing handler
	return handleGenericThing(data);
}

// Utility function to get all detected types from JSON-LD array
export function processJsonLdArray(
	jsonLdArray: WithContext<Thing>[],
): ExtractedSchemaData[] {
	return jsonLdArray.map(detectAndProcessSchema);
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

export interface HtmlMetadata {
	openGraph: Record<string, string>;
	jsonLd: WithContext<Thing>[];
	processedSchemas: ExtractedSchemaData[];
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

export async function extractHtmlMetadata(html: string): Promise<HtmlMetadata> {
	const root = parse(html);

	const openGraph: Record<string, string> = {};
	const jsonLd: WithContext<Thing>[] = [];
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
					if (isValidThing(item)) {
						jsonLd.push(item);
					}
				}
			} else if (Array.isArray(rawData)) {
				// Handle JSON-LD arrays that aren't graphs
				for (const item of rawData) {
					if (isValidThing(item)) {
						jsonLd.push(item);
					}
				}
			} else {
				if (isValidThing(rawData)) {
					jsonLd.push(rawData);
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

	// Process all JSON-LD data through type detection system
	const processedSchemas = processJsonLdArray(jsonLd);

	if (Object.keys(openGraph).length === 0 && jsonLd.length === 0) {
		console.log("no useful metadata found", html);
	}

	const metadata: HtmlMetadata = {
		openGraph,
		jsonLd,
		processedSchemas,
		title,
		description,
		articleTags,
	};

	return metadata;
}
