import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { getUserIdFromSession } from "@sill/auth";
import {
  getTimeline,
  findLinksByAuthor,
  findLinksByDomain,
  fetchLinks,
  networkTopTen,
  pushShareBatches,
} from "@sill/links";

// Schema for filtering links
const FilterLinksSchema = z.object({
  time: z.coerce.number().default(86400000), // 24 hours default
  hideReposts: z.enum(["include", "exclude", "only"]).default("include"),
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

// Schema for finding links by author
// Shared discovery filters (mirrors the main feed) for by-author / by-domain.
const DiscoveryFilterSchema = {
  cursor: z.string().optional(),
  time: z.coerce.number().optional(),
  service: z.enum(["mastodon", "bluesky", "all"]).optional(),
  list: z.string().optional(),
  reposts: z.enum(["include", "exclude", "only"]).optional(),
  minShares: z.coerce.number().min(1).max(1000).optional(),
  sort: z.enum(["popularity", "recency"]).optional(),
};

const FindLinksByAuthorSchema = z.object({
  author: z.string().min(1),
  pageSize: z.coerce.number().min(1).max(100).default(10),
  ...DiscoveryFilterSchema,
});

// Schema for finding links by domain (now publication-scoped — see API.md
// `/v1/by-publication`). `publication` picks a brand on the host; omit for primary.
const FindLinksByDomainSchema = z.object({
  domain: z.string().min(1),
  pageSize: z.coerce.number().min(1).max(100).default(10),
  publication: z.string().optional(),
  ...DiscoveryFilterSchema,
});

// Schema for processing links
const ProcessLinksSchema = z.object({
  type: z.enum(["bluesky", "mastodon"]).optional(),
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
      const result = await getTimeline({
        userId,
        ...params,
      });
      return c.json(result);
    } catch (error) {
      console.error("Filter links error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // GET /api/links/author - Find links by author
  .get("/author", zValidator("query", FindLinksByAuthorSchema), async (c) => {
    const { author, pageSize, cursor, time, service, list, reposts, minShares, sort } =
      c.req.valid("query");
    const userId = (await getUserIdFromSession(c.req.raw)) ?? undefined;

    try {
      const result = await findLinksByAuthor(author, pageSize, userId, cursor, {
        time,
        service,
        selectedList: list,
        hideReposts: reposts,
        minShares,
        sort,
      });
      return c.json(result);
    } catch (error) {
      console.error("Find links by author error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // GET /api/links/domain - Find links by domain
  .get("/domain", zValidator("query", FindLinksByDomainSchema), async (c) => {
    const {
      domain,
      pageSize,
      cursor,
      publication,
      time,
      service,
      list,
      reposts,
      minShares,
      sort,
    } = c.req.valid("query");
    const userId = (await getUserIdFromSession(c.req.raw)) ?? undefined;

    try {
      const result = await findLinksByDomain(domain, pageSize, userId, cursor, {
        publication,
        time,
        service,
        selectedList: list,
        hideReposts: reposts,
        minShares,
        sort,
      });
      return c.json(result);
    } catch (error) {
      console.error("Find links by domain error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // POST /api/links/process - Process social media links
  .post("/process", zValidator("json", ProcessLinksSchema), async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);

    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    const { type } = c.req.valid("json");

    try {
      // One-off: collect this user's shares and POST them as a single batch.
      const batch = await fetchLinks(userId, type);
      if (batch) await pushShareBatches([batch]);

      return c.json({
        success: true,
        type: type || "all",
      });
    } catch (error) {
      console.error("Process links error:", error);
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
  .get("/trending", async (c) => {
    try {
      const result = await networkTopTen();
      return c.json(result);
    } catch (error) {
      console.error("Network top ten error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // Example with validation
  .get(
    "/:id",
    zValidator(
      "param",
      z.object({
        id: z.string().uuid(),
      })
    ),
    (c) => {
      const { id } = c.req.valid("param");
      return c.json({
        message: `Link ${id} endpoint`,
        data: null,
      });
    }
  );

export default links;
