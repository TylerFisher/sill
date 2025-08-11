import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { uuidv7 } from "uuidv7-js";
import { getUserIdFromSession } from "../auth/auth.server.js";
import { db, mutePhrase } from "@sill/schema";

// Schema for adding a new mute phrase
const AddMutePhraseSchema = z.object({
  phrase: z.string().trim().min(1, "Phrase cannot be empty"),
});

// Schema for deleting a mute phrase
const DeleteMutePhraseSchema = z.object({
  phrase: z.string().min(1, "Phrase cannot be empty"),
});

const mute = new Hono()
  // GET /api/mute/phrases - Get all mute phrases for user
  .get("/phrases", async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);

    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    try {
      const phrases = await db.query.mutePhrase.findMany({
        where: eq(mutePhrase.userId, userId),
        columns: {
          id: true,
          phrase: true,
          createdAt: true,
        },
        orderBy: (mutePhrase, { desc }) => [desc(mutePhrase.createdAt)],
      });

      return c.json({ phrases });
    } catch (error) {
      console.error("Get mute phrases error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // POST /api/mute/phrases - Add new mute phrase
  .post("/phrases", zValidator("json", AddMutePhraseSchema), async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);

    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    const { phrase } = c.req.valid("json");

    try {
      // Check if phrase already exists for this user (case-insensitive)
      const existingPhrases = await db.query.mutePhrase.findMany({
        where: eq(mutePhrase.userId, userId),
        columns: {
          phrase: true,
        },
      });

      const phrases = existingPhrases.map((p) => p.phrase.toLowerCase());
      if (phrases.includes(phrase.toLowerCase())) {
        return c.json(
          {
            error: "You've already added this phrase to your mute list",
            field: "phrase",
          },
          409
        );
      }

      // Insert new mute phrase
      const result = await db
        .insert(mutePhrase)
        .values({
          id: uuidv7(),
          phrase,
          userId,
        })
        .returning({
          id: mutePhrase.id,
          phrase: mutePhrase.phrase,
          createdAt: mutePhrase.createdAt,
        });

      return c.json({ success: true, mutePhrase: result[0] });
    } catch (error) {
      console.error("Add mute phrase error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // DELETE /api/mute/phrases - Delete a mute phrase
  .delete("/phrases", zValidator("json", DeleteMutePhraseSchema), async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);

    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    const { phrase } = c.req.valid("json");

    try {
      // Delete the mute phrase for this user
      const result = await db
        .delete(mutePhrase)
        .where(
          and(eq(mutePhrase.userId, userId), eq(mutePhrase.phrase, phrase))
        )
        .returning({
          id: mutePhrase.id,
          phrase: mutePhrase.phrase,
        });

      if (result.length === 0) {
        return c.json(
          {
            error: "Mute phrase not found",
            field: "phrase",
          },
          404
        );
      }

      return c.json({ success: true, deleted: result[0] });
    } catch (error) {
      console.error("Delete mute phrase error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

export default mute;
