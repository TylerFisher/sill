import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { uuidv7 } from "uuidv7-js";
import { getUserIdFromSession, isSubscribed } from "@sill/auth";
import { db, filterPreset } from "@sill/schema";

// The most presets one account can keep. A generous cap that mostly exists to
// stop runaway growth.
const MAX_PRESETS = 24;

// The filter values a preset captures, including the free-text search query.
// All optional — an empty preset is just "clear all".
const FilterConfigSchema = z.object({
  time: z.string().optional(),
  service: z.string().optional(),
  list: z.string().optional(),
  minShares: z.string().optional(),
  reposts: z.string().optional(),
  sort: z.string().optional(),
  query: z.string().optional(),
});

const CreatePresetSchema = z.object({
  name: z.string().trim().min(1, "Name cannot be empty").max(60),
  filters: FilterConfigSchema,
});

const DeletePresetSchema = z.object({
  id: z.string().min(1),
});

const UpdatePresetSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Name cannot be empty").max(60).optional(),
  filters: FilterConfigSchema.optional(),
});

const filterPresets = new Hono()
  // GET /api/filter-presets - List the user's saved presets (Sill+ only)
  .get("/", async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);
    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    // Saved feeds are a Sill+ feature: don't surface them for non-plus users
    // even if rows linger in the DB from a past subscription.
    if ((await isSubscribed(userId)) !== "plus") {
      return c.json({ presets: [] });
    }

    try {
      const presets = await db.query.filterPreset.findMany({
        where: eq(filterPreset.userId, userId),
        columns: { id: true, name: true, filters: true, createdAt: true },
        orderBy: (filterPreset, { asc }) => [asc(filterPreset.createdAt)],
      });
      return c.json({ presets });
    } catch (error) {
      console.error("Get filter presets error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // POST /api/filter-presets - Create a preset (Sill+ only)
  .post("/", zValidator("json", CreatePresetSchema), async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);
    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    // Saving presets is a Sill+ feature. Listing and deleting stay open so a
    // lapsed subscriber can still manage what they already saved.
    const subscribed = await isSubscribed(userId);
    if (subscribed !== "plus") {
      return c.json({ error: "Saved filters are a Sill+ feature" }, 403);
    }

    const { name, filters } = c.req.valid("json");

    try {
      const count = await db.$count(
        filterPreset,
        eq(filterPreset.userId, userId)
      );
      if (count >= MAX_PRESETS) {
        return c.json(
          { error: `You can save up to ${MAX_PRESETS} presets` },
          409
        );
      }

      const result = await db
        .insert(filterPreset)
        .values({ id: uuidv7(), userId, name, filters })
        .returning({
          id: filterPreset.id,
          name: filterPreset.name,
          filters: filterPreset.filters,
          createdAt: filterPreset.createdAt,
        });

      return c.json({ success: true, preset: result[0] });
    } catch (error) {
      // Unique (userId, name) violation.
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23505"
      ) {
        return c.json(
          { error: "You already have a preset with that name", field: "name" },
          409
        );
      }
      console.error("Create filter preset error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // DELETE /api/filter-presets - Delete a preset by id
  .delete("/", zValidator("json", DeletePresetSchema), async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);
    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    const { id } = c.req.valid("json");

    try {
      const result = await db
        .delete(filterPreset)
        .where(and(eq(filterPreset.id, id), eq(filterPreset.userId, userId)))
        .returning({ id: filterPreset.id });

      if (result.length === 0) {
        return c.json({ error: "Preset not found" }, 404);
      }

      return c.json({ success: true, deleted: result[0] });
    } catch (error) {
      console.error("Delete filter preset error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // PATCH /api/filter-presets - Rename a preset or repoint it at new filters
  .patch("/", zValidator("json", UpdatePresetSchema), async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);
    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    // Editing presets is a Sill+ feature, like creating them.
    if ((await isSubscribed(userId)) !== "plus") {
      return c.json({ error: "Saved filters are a Sill+ feature" }, 403);
    }

    const { id, name, filters } = c.req.valid("json");
    if (name === undefined && filters === undefined) {
      return c.json({ error: "Nothing to update" }, 400);
    }

    const updates: { name?: string; filters?: typeof filters } = {};
    if (name !== undefined) updates.name = name;
    if (filters !== undefined) updates.filters = filters;

    try {
      const result = await db
        .update(filterPreset)
        .set(updates)
        .where(and(eq(filterPreset.id, id), eq(filterPreset.userId, userId)))
        .returning({
          id: filterPreset.id,
          name: filterPreset.name,
          filters: filterPreset.filters,
          createdAt: filterPreset.createdAt,
        });

      if (result.length === 0) {
        return c.json({ error: "Preset not found" }, 404);
      }

      return c.json({ success: true, preset: result[0] });
    } catch (error) {
      // Unique (userId, name) violation from a rename.
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23505"
      ) {
        return c.json(
          { error: "You already have a preset with that name", field: "name" },
          409
        );
      }
      console.error("Update filter preset error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

export default filterPresets;
