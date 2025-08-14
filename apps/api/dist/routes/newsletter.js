import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { uuidv7 } from "uuidv7-js";
import { db, digestItem, digestRssFeed, user, } from "@sill/schema";
import { isSubscribed } from "@sill/auth";
import { filterLinkOccurrences } from "@sill/links";
import { preview, subject } from "../utils/digestText.server";
import { sendDigestEmail, renderDigestRSS } from "@sill/emails";
const newsletter = new Hono()
    // GET /api/newsletter/send - Send scheduled newsletters (cron only)
    .get("/send", async (c) => {
    // Check authorization header
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return c.json({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.split(" ")[1];
    if (token !== process.env.CRON_API_KEY) {
        return c.json({ error: "Forbidden" }, 403);
    }
    try {
        const requestUrl = new URL(c.req.url);
        const baseUrl = `${requestUrl.origin}/digest`;
        const scheduledDigests = await db.query.digestSettings.findMany();
        const hour = c.req.query("hour");
        const digests = await Promise.all(scheduledDigests.map(async (digest) => {
            const currentHourUTC = hour
                ? Number.parseInt(hour)
                : new Date().getUTCHours();
            if (Number.parseInt(digest.scheduledTime.split(":")[0]) ===
                currentHourUTC) {
                return digest;
            }
        }));
        for (const digest of digests) {
            if (!digest) {
                continue;
            }
            const dbUser = await db.query.user.findFirst({
                where: eq(user.id, digest.userId),
                with: { subscriptions: true },
            });
            if (!dbUser) {
                console.error("Couldn't find user for digest");
                continue;
            }
            const subscribed = await isSubscribed(dbUser.id);
            if (subscribed === "free") {
                continue;
            }
            let links = [];
            try {
                links = await filterLinkOccurrences({
                    userId: dbUser.id,
                    hideReposts: digest.hideReposts,
                    limit: digest.topAmount,
                });
            }
            catch (error) {
                console.error("Failed to fetch links:", error);
                // Retry once
                try {
                    links = await filterLinkOccurrences({
                        userId: dbUser.id,
                        hideReposts: digest.hideReposts,
                        limit: digest.topAmount,
                    });
                }
                catch (error) {
                    console.error("Second fetch failed:", error);
                }
            }
            const digestId = uuidv7();
            const digestUrl = `${baseUrl}/${dbUser.id}/${digestId}`;
            const digestItemValues = {
                id: digestId,
                title: subject,
                json: links,
                description: preview(links),
                pubDate: new Date().toISOString(),
                userId: dbUser.id,
            };
            if (digest.digestType === "email") {
                const emailSubject = links.length === 0 ? "No links found" : subject;
                try {
                    await sendDigestEmail({
                        to: dbUser.email,
                        subject: emailSubject,
                        links,
                        name: dbUser.name,
                        digestUrl,
                        layout: digest.layout,
                        subscribed,
                        freeTrialEnd: dbUser.freeTrialEnd
                            ? new Date(dbUser.freeTrialEnd)
                            : null,
                    });
                    console.log(`Email sent to ${dbUser.email}: ${emailSubject}`);
                }
                catch (error) {
                    console.error(`Failed to send email to ${dbUser.email}:`, error);
                }
            }
            else {
                const rssFeed = await db.query.digestRssFeed.findFirst({
                    where: eq(digestRssFeed.userId, digest.userId),
                });
                digestItemValues.feedId = rssFeed?.id;
                try {
                    digestItemValues.html = await renderDigestRSS({
                        links,
                        name: dbUser.name,
                        digestUrl,
                        subscribed,
                    });
                    console.log(`RSS digest created for ${dbUser.email}`);
                }
                catch (error) {
                    console.error(`Failed to render RSS for ${dbUser.email}:`, error);
                    digestItemValues.html = "<p>Error rendering digest content</p>";
                }
            }
            if (links.length === 0) {
                continue;
            }
            try {
                await db.insert(digestItem).values(digestItemValues);
            }
            catch (error) {
                console.error("Failed to insert digest item for", dbUser.email, error);
            }
        }
        return c.json({ success: true });
    }
    catch (error) {
        console.error("Newsletter send error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
export default newsletter;
