import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { uuidv7 } from "uuidv7-js";
import { getUserIdFromSession } from "@sill/auth";
import { db, termsAgreement, termsUpdate } from "@sill/schema";
// Schema for getting terms agreement
const GetTermsAgreementSchema = z.object({
    termsUpdateId: z.string().uuid(),
});
// Schema for inserting terms agreement
const InsertTermsAgreementSchema = z.object({
    termsUpdateId: z.string().uuid(),
});
const terms = new Hono()
    // GET /api/terms/latest - Get latest terms update
    .get("/latest", async (c) => {
    try {
        const latestTerms = await db.query.termsUpdate.findFirst({
            orderBy: desc(termsUpdate.termsDate),
        });
        if (!latestTerms) {
            return c.json({ error: "No terms found" }, 404);
        }
        return c.json(latestTerms);
    }
    catch (error) {
        console.error("Get latest terms error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
})
    // GET /api/terms/agreement - Get terms agreement for user and terms update
    .get("/agreement", zValidator("query", GetTermsAgreementSchema), async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);
    if (!userId) {
        return c.json({ error: "Not authenticated" }, 401);
    }
    const { termsUpdateId } = c.req.valid("query");
    try {
        const agreement = await db.query.termsAgreement.findFirst({
            where: and(eq(termsAgreement.termsUpdateId, termsUpdateId), eq(termsAgreement.userId, userId)),
        });
        return c.json({ agreement: agreement || null });
    }
    catch (error) {
        console.error("Get terms agreement error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
})
    // POST /api/terms/agreement - Insert terms agreement
    .post("/agreement", zValidator("json", InsertTermsAgreementSchema), async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);
    if (!userId) {
        return c.json({ error: "Not authenticated" }, 401);
    }
    const { termsUpdateId } = c.req.valid("json");
    try {
        // Check if already agreed
        const existingAgreement = await db.query.termsAgreement.findFirst({
            where: and(eq(termsAgreement.termsUpdateId, termsUpdateId), eq(termsAgreement.userId, userId)),
        });
        if (existingAgreement) {
            return c.json({ success: true, message: "Already agreed" });
        }
        // Insert new agreement
        const result = await db
            .insert(termsAgreement)
            .values({
            id: uuidv7(),
            userId,
            termsUpdateId,
        })
            .returning({
            id: termsAgreement.id,
        });
        return c.json({ success: true, id: result[0].id });
    }
    catch (error) {
        console.error("Insert terms agreement error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
export default terms;
