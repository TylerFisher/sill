import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getUserIdFromSession } from "../auth/auth.server.js";
import { filterLinkOccurrences } from "../utils/links.server.js";
// Schema for filtering links
const FilterLinksSchema = z.object({
    time: z.number().optional().default(86400000), // 24 hours default
    hideReposts: z.boolean().optional().default(false),
    sort: z.string().optional().default("popularity"),
    query: z.string().optional(),
    service: z.enum(["mastodon", "bluesky", "all"]).optional().default("all"),
    page: z.number().min(1).optional().default(1),
    fetch: z.boolean().optional().default(false),
    selectedList: z.string().optional().default("all"),
    limit: z.number().min(1).max(100).optional().default(10),
    url: z.string().optional(),
    minShares: z.number().optional(),
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
    }
    catch (error) {
        console.error("Filter links error:", error);
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
    .get("/:id", zValidator("param", z.object({
    id: z.string().uuid(),
})), (c) => {
    const { id } = c.req.valid("param");
    return c.json({
        message: `Link ${id} endpoint`,
        data: null,
    });
});
export default links;
