import { describe, expect, it } from "vitest";
import { extractHtmlMetadata } from "./metadata.js";

// Helper to create minimal HTML with Open Graph and JSON-LD
function createHtml({
	ogUrl = "https://example.com/article",
	ogTitle = "Test Article",
	ogDescription = "Test description",
	ogImage = "https://example.com/image.jpg",
	ogSiteName = "Example Site",
	jsonLd,
}: {
	ogUrl?: string;
	ogTitle?: string;
	ogDescription?: string;
	ogImage?: string;
	ogSiteName?: string;
	jsonLd?: object | object[];
}) {
	const jsonLdScript = jsonLd
		? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`
		: "";

	return `
<!DOCTYPE html>
<html>
<head>
  <meta property="og:url" content="${ogUrl}">
  <meta property="og:title" content="${ogTitle}">
  <meta property="og:description" content="${ogDescription}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:site_name" content="${ogSiteName}">
  ${jsonLdScript}
</head>
<body></body>
</html>
  `;
}

describe("extractHtmlMetadata", () => {
	describe("basic metadata extraction", () => {
		it("extracts Open Graph metadata", async () => {
			const html = createHtml({});
			const result = await extractHtmlMetadata(html);

			expect(result).not.toBeNull();
			expect(result?.title).toBe("Test Article");
			expect(result?.description).toBe("Test description");
			expect(result?.imageUrl).toBe("https://example.com/image.jpg");
			expect(result?.siteName).toBe("Example Site");
			expect(result?.scraped).toBe(true);
		});

		it("returns null when ogUrl is missing", async () => {
			const html = `
<!DOCTYPE html>
<html>
<head>
  <meta property="og:title" content="Test">
</head>
<body></body>
</html>
      `;
			const result = await extractHtmlMetadata(html);
			expect(result).toBeNull();
		});
	});

	describe("author parsing", () => {
		it("parses single author object", async () => {
			const html = createHtml({
				jsonLd: {
					"@type": "NewsArticle",
					author: { name: "John Doe" },
				},
			});
			const result = await extractHtmlMetadata(html);

			expect(result?.authors).toEqual(["John Doe"]);
		});

		it("parses array of author objects with name", async () => {
			const html = createHtml({
				jsonLd: {
					"@type": "Article",
					author: [{ name: "Jane Smith" }, { name: "Bob Wilson" }],
				},
			});
			const result = await extractHtmlMetadata(html);

			expect(result?.authors).toEqual(["Jane Smith", "Bob Wilson"]);
		});

		it("parses authors with mainEntity structure", async () => {
			const html = createHtml({
				jsonLd: {
					"@type": "NewsArticle",
					author: [
						{ mainEntity: { name: "Alice Johnson" } },
						{ mainEntity: { name: "Charlie Brown" } },
					],
				},
			});
			const result = await extractHtmlMetadata(html);

			expect(result?.authors).toEqual(["Alice Johnson", "Charlie Brown"]);
		});

		it("resolves graph-style @id author references", async () => {
			const html = createHtml({
				jsonLd: {
					"@context": "https://schema.org",
					"@graph": [
						{
							"@type": "Article",
							"@id": "https://example.com/article#article",
							author: [
								{ "@id": "https://example.com/person/1" },
								{ "@id": "https://example.com/person/2" },
								{ "@id": "https://example.com/person/3" },
							],
							headline: "Test Headline",
						},
						{
							"@type": "Person",
							"@id": "https://example.com/person/1",
							name: "Pratheek Rebala",
						},
						{
							"@type": "Person",
							"@id": "https://example.com/person/2",
							name: "Jeff Ernsthausen",
						},
						{
							"@type": "Person",
							"@id": "https://example.com/person/3",
							name: "Perla Trevizo",
						},
					],
				},
			});
			const result = await extractHtmlMetadata(html);

			expect(result?.authors).toEqual([
				"Pratheek Rebala",
				"Jeff Ernsthausen",
				"Perla Trevizo",
			]);
		});

		it("handles @id references with HTML entities", async () => {
			const html = createHtml({
				jsonLd: {
					"@context": "https://schema.org",
					"@graph": [
						{
							"@type": "Article",
							author: [
								{
									"@id":
										"https://www.propublica.org/?post_type=profile&#038;p=1479",
								},
							],
						},
						{
							"@type": "Person",
							"@id": "https://www.propublica.org/?post_type=profile&#038;p=1479",
							name: "Test Author",
						},
					],
				},
			});
			const result = await extractHtmlMetadata(html);

			expect(result?.authors).toEqual(["Test Author"]);
		});

		it("returns null when @id reference cannot be resolved", async () => {
			const html = createHtml({
				jsonLd: {
					"@context": "https://schema.org",
					"@graph": [
						{
							"@type": "Article",
							author: [{ "@id": "https://example.com/person/nonexistent" }],
						},
					],
				},
			});
			const result = await extractHtmlMetadata(html);

			expect(result?.authors).toBeNull();
		});

		it("handles mixed resolved and unresolved @id references", async () => {
			const html = createHtml({
				jsonLd: {
					"@context": "https://schema.org",
					"@graph": [
						{
							"@type": "Article",
							author: [
								{ "@id": "https://example.com/person/1" },
								{ "@id": "https://example.com/person/missing" },
								{ "@id": "https://example.com/person/2" },
							],
						},
						{
							"@type": "Person",
							"@id": "https://example.com/person/1",
							name: "First Author",
						},
						{
							"@type": "Person",
							"@id": "https://example.com/person/2",
							name: "Second Author",
						},
					],
				},
			});
			const result = await extractHtmlMetadata(html);

			expect(result?.authors).toEqual(["First Author", "Second Author"]);
		});

		it("returns null authors when no author data present", async () => {
			const html = createHtml({
				jsonLd: {
					"@type": "NewsArticle",
					headline: "No Author Article",
				},
			});
			const result = await extractHtmlMetadata(html);

			expect(result?.authors).toBeNull();
		});
	});

	describe("date parsing", () => {
		it("extracts datePublished from JSON-LD", async () => {
			const html = createHtml({
				jsonLd: {
					"@type": "NewsArticle",
					datePublished: "2024-01-15T10:00:00+00:00",
				},
			});
			const result = await extractHtmlMetadata(html);

			expect(result?.publishedDate).toBe("2024-01-15T10:00:00+00:00");
		});

		it("extracts date from graph structure", async () => {
			const html = createHtml({
				jsonLd: {
					"@graph": [
						{
							"@type": "Article",
							datePublished: "2024-02-20T15:30:00Z",
						},
					],
				},
			});
			const result = await extractHtmlMetadata(html);

			expect(result?.publishedDate).toBe("2024-02-20T15:30:00Z");
		});
	});

	describe("topics/keywords parsing", () => {
		it("extracts keywords array", async () => {
			const html = createHtml({
				jsonLd: {
					"@type": "NewsArticle",
					keywords: ["politics", "immigration", "courts"],
				},
			});
			const result = await extractHtmlMetadata(html);

			expect(result?.topics).toEqual(["politics", "immigration", "courts"]);
		});

		it("parses comma-separated keywords string", async () => {
			const html = createHtml({
				jsonLd: {
					"@type": "Article",
					keywords: "technology, science, innovation",
				},
			});
			const result = await extractHtmlMetadata(html);

			expect(result?.topics).toEqual(["technology", "science", "innovation"]);
		});

		it("returns empty array when no keywords", async () => {
			const html = createHtml({
				jsonLd: {
					"@type": "NewsArticle",
				},
			});
			const result = await extractHtmlMetadata(html);

			expect(result?.topics).toEqual([]);
		});
	});

	describe("publisher parsing", () => {
		it("extracts publisher name from JSON-LD", async () => {
			const html = createHtml({
				ogSiteName: "OG Site Name",
				jsonLd: {
					"@type": "NewsArticle",
					publisher: { name: "ProPublica" },
				},
			});
			const result = await extractHtmlMetadata(html);

			expect(result?.siteName).toBe("ProPublica");
		});

		it("falls back to ogSiteName when no publisher in JSON-LD", async () => {
			const html = createHtml({
				ogSiteName: "Fallback Site",
				jsonLd: {
					"@type": "NewsArticle",
				},
			});
			const result = await extractHtmlMetadata(html);

			expect(result?.siteName).toBe("Fallback Site");
		});

		it("resolves publisher @id reference to Organization", async () => {
			const html = createHtml({
				jsonLd: {
					"@graph": [
						{
							"@type": "NewsArticle",
							publisher: { "@id": "https://example.com/#organization" },
						},
						{
							"@type": "Organization",
							"@id": "https://example.com/#organization",
							name: "Example News Org",
						},
					],
				},
			});
			const result = await extractHtmlMetadata(html);

			expect(result?.siteName).toBe("Example News Org");
		});

		it("resolves publisher @id reference to NewsMediaOrganization", async () => {
			const html = createHtml({
				jsonLd: {
					"@graph": [
						{
							"@type": "NewsArticle",
							publisher: { "@id": "https://www.cbsnews.com/minnesota/" },
						},
						{
							"@type": "NewsMediaOrganization",
							"@id": "https://www.cbsnews.com/minnesota/",
							name: "CBS Minnesota",
							foundingDate: "1949-07-01",
							url: "https://www.cbsnews.com/minnesota/",
						},
					],
				},
			});
			const result = await extractHtmlMetadata(html);

			expect(result?.siteName).toBe("CBS Minnesota");
		});
	});

	describe("YouTube VideoObject parsing", () => {
		it("extracts author from VideoObject for YouTube URLs", async () => {
			const html = createHtml({
				ogUrl: "https://www.youtube.com/watch?v=abc123",
				jsonLd: {
					"@type": "VideoObject",
					name: "Test Video",
					author: "Video Creator",
					uploadDate: "2024-03-01",
					genre: "Education",
				},
			});
			const result = await extractHtmlMetadata(html);

			expect(result?.authors).toEqual(["Video Creator"]);
			expect(result?.publishedDate).toBe("2024-03-01");
			expect(result?.topics).toEqual(["Education"]);
		});

		it("ignores VideoObject for non-YouTube URLs", async () => {
			const html = createHtml({
				ogUrl: "https://example.com/video",
				jsonLd: [
					{
						"@type": "VideoObject",
						author: "Video Creator",
					},
					{
						"@type": "NewsArticle",
						author: { name: "Article Author" },
					},
				],
			});
			const result = await extractHtmlMetadata(html);

			expect(result?.authors).toEqual(["Article Author"]);
		});
	});

	describe("nested JSON-LD structures", () => {
		it("finds Article in deeply nested @graph", async () => {
			const html = createHtml({
				jsonLd: {
					"@context": "https://schema.org",
					"@graph": [
						{ "@type": "WebSite", name: "Test Site" },
						{ "@type": "WebPage", name: "Test Page" },
						{
							"@type": "Article",
							author: { name: "Nested Author" },
							datePublished: "2024-05-01",
						},
						{ "@type": "Organization", name: "Test Org" },
					],
				},
			});
			const result = await extractHtmlMetadata(html);

			expect(result?.authors).toEqual(["Nested Author"]);
			expect(result?.publishedDate).toBe("2024-05-01");
		});

		it("handles array of JSON-LD objects", async () => {
			const html = createHtml({
				jsonLd: [
					{ "@type": "Organization", name: "Org" },
					{ "@type": "NewsArticle", author: { name: "Array Author" } },
				],
			});
			const result = await extractHtmlMetadata(html);

			expect(result?.authors).toEqual(["Array Author"]);
		});
	});

	describe("real-world ProPublica example", () => {
		it("parses ProPublica-style graph with @id references", async () => {
			const html = createHtml({
				ogUrl:
					"https://www.propublica.org/article/habeas-petitions-immigrant-detentions-trump",
				ogTitle:
					"Immigrants Who Say Their Detention Is Illegal Have Filed More Than 18,000 Cases",
				jsonLd: {
					"@context": "https://schema.org",
					"@graph": [
						{
							"@type": "Article",
							"@id":
								"https://www.propublica.org/article/habeas-petitions-immigrant-detentions-trump#article",
							author: [
								{
									"@id":
										"https://www.propublica.org/?post_type=profile&#038;p=1479",
								},
								{
									"@id":
										"https://www.propublica.org/?post_type=profile&#038;p=781",
								},
								{
									"@id":
										"https://www.propublica.org/?post_type=profile&#038;p=1451",
								},
							],
							headline:
								"Immigrants Who Say Their Detention Is Illegal Have Filed More Than 18,000 Cases. It's a Historic High.",
							datePublished: "2024-02-10T10:00:00+00:00",
							publisher: {
								"@id": "https://www.propublica.org/#organization",
							},
						},
						{
							"@type": "Organization",
							"@id": "https://www.propublica.org/#organization",
							name: "ProPublica",
						},
						{
							"@type": "Person",
							"@id": "https://www.propublica.org/?post_type=profile&#038;p=1479",
							name: "Pratheek Rebala",
						},
						{
							"@type": "Person",
							"@id": "https://www.propublica.org/?post_type=profile&#038;p=781",
							name: "Jeff Ernsthausen",
						},
						{
							"@type": "Person",
							"@id": "https://www.propublica.org/?post_type=profile&#038;p=1451",
							name: "Perla Trevizo",
						},
					],
				},
			});
			const result = await extractHtmlMetadata(html);

			expect(result?.title).toBe(
				"Immigrants Who Say Their Detention Is Illegal Have Filed More Than 18,000 Cases",
			);
			expect(result?.authors).toEqual([
				"Pratheek Rebala",
				"Jeff Ernsthausen",
				"Perla Trevizo",
			]);
			expect(result?.publishedDate).toBe("2024-02-10T10:00:00+00:00");
		});
	});
});
