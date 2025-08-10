import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { getUserIdFromSession } from "../auth/auth.server.js";
import { db } from "../database/db.server.js";
import { link } from "../database/schema.server.js";
import { filterLinkOccurrences, findLinksByAuthor, findLinksByDomain, findLinksByTopic } from "../utils/links.server.js";

// Schema for filtering links
const FilterLinksSchema = z.object({
	time: z.coerce.number().default(86400000), // 24 hours default
	hideReposts: z
		.string()
		.transform((val) => val === "true")
		.default("false"),
	sort: z.string().default("popularity"),
	query: z.string().optional(),
	service: z.enum(["mastodon", "bluesky", "all"]).default("all"),
	page: z.coerce.number().min(1).default(1),
	fetch: z
		.string()
		.transform((val) => val === "true")
		.default("false"),
	selectedList: z.string().default("all"),
	limit: z.coerce.number().min(1).max(100).default(10),
	url: z.string().optional(),
	minShares: z.coerce.number().optional(),
});

// Schema for updating link metadata
const UpdateMetadataSchema = z.object({
	url: z.string().url(),
	metadata: z.object({
		title: z.string().nullable().optional(),
		description: z.string().nullable().optional(),
		imageUrl: z.string().nullable().optional(),
		siteName: z.string().nullable().optional(),
		publishedDate: z
			.string()
			.nullable()
			.optional()
			.transform((val) => (val ? new Date(val) : null)),
		authors: z.array(z.string()).nullable().optional(),
		topics: z.array(z.string()).nullable().optional(),
		metadata: z.record(z.unknown()).nullable().optional(),
	}),
});

// Schema for finding links by author
const FindLinksByAuthorSchema = z.object({
	author: z.string().min(1),
	page: z.coerce.number().min(1).default(1),
	pageSize: z.coerce.number().min(1).max(100).default(10),
});

// Schema for finding links by domain
const FindLinksByDomainSchema = z.object({
	domain: z.string().min(1),
	page: z.coerce.number().min(1).default(1),
	pageSize: z.coerce.number().min(1).max(100).default(10),
});

// Schema for finding links by topic
const FindLinksByTopicSchema = z.object({
	topic: z.string().min(1),
	page: z.coerce.number().min(1).default(1),
	pageSize: z.coerce.number().min(1).max(100).default(10),
});

const links = new Hono()
	// GET /api/links/filter - Filter link occurrences
	.get("/filter", zValidator("query", FilterLinksSchema), async (c) => {
		const userId = await getUserIdFromSession(c.req.raw);

		if (!userId) {
			return c.json({ error: "Not authenticated" }, 401);
		}
		const params = c.req.valid("query");

		try {
			const result = await filterLinkOccurrences({
				userId,
				...params,
			});

			return c.json(result);
		} catch (error) {
			console.error("Filter links error:", error);
			return c.json({ error: "Internal server error" }, 500);
		}
	})
	// POST /api/links/metadata - Update link metadata
	.post("/metadata", zValidator("json", UpdateMetadataSchema), async (c) => {
		const userId = await getUserIdFromSession(c.req.raw);

		if (!userId) {
			return c.json({ error: "Not authenticated" }, 401);
		}

		const { url, metadata } = c.req.valid("json");

		try {
			const result = await db
				.update(link)
				.set(metadata)
				.where(eq(link.url, url))
				.returning();

			if (result.length === 0) {
				return c.json({ error: "Link not found" }, 404);
			}

			return c.json({ success: true, link: result[0] });
		} catch (error) {
			console.error("Update metadata error:", error);
			return c.json({ error: "Internal server error" }, 500);
		}
	})
	// GET /api/links/author - Find links by author
	.get("/author", zValidator("query", FindLinksByAuthorSchema), async (c) => {
		const { author, page, pageSize } = c.req.valid("query");

		try {
			const result = await findLinksByAuthor(author, page, pageSize);
			return c.json(result);
		} catch (error) {
			console.error("Find links by author error:", error);
			return c.json({ error: "Internal server error" }, 500);
		}
	})
	// GET /api/links/domain - Find links by domain
	.get("/domain", zValidator("query", FindLinksByDomainSchema), async (c) => {
		const { domain, page, pageSize } = c.req.valid("query");

		try {
			const result = await findLinksByDomain(domain, page, pageSize);
			return c.json(result);
		} catch (error) {
			console.error("Find links by domain error:", error);
			return c.json({ error: "Internal server error" }, 500);
		}
	})
	// GET /api/links/topic - Find links by topic
	.get("/topic", zValidator("query", FindLinksByTopicSchema), async (c) => {
		const { topic, page, pageSize } = c.req.valid("query");

		try {
			const result = await findLinksByTopic(topic, page, pageSize);
			return c.json(result);
		} catch (error) {
			console.error("Find links by topic error:", error);
			return c.json({ error: "Internal server error" }, 500);
		}
	})
	// Example route that could use shared utilities in the future
	.get("/", (c) => {
		return c.json({
			message: "Links list endpoint",
			data: [],
			count: 0,
		});
	})
	.get("/trending", (c) => {
		return c.json({
			message: "Trending links endpoint",
			data: [],
			count: 0,
		});
	})
	// Example with validation
	.get(
		"/:id",
		zValidator(
			"param",
			z.object({
				id: z.string().uuid(),
			}),
		),
		(c) => {
			const { id } = c.req.valid("param");
			return c.json({
				message: `Link ${id} endpoint`,
				data: null,
			});
		},
	);

export default links;
