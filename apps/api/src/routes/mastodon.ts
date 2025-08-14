import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { uuidv7 } from "uuidv7-js";
import { z } from "zod";
import { getUserIdFromSession } from "@sill/auth";
import { db, mastodonAccount, mastodonInstance, user } from "@sill/schema";
import { getMastodonLists } from "@sill/links";

const AuthorizeSchema = z.object({
  instance: z.string().min(1),
});

const CallbackSchema = z.object({
  code: z.string().min(1),
  instance: z.string().min(1),
});

/**
 * Get authorization URL for Mastodon instance
 */
function getAuthorizationUrl(instance: string, clientId: string): string {
  const url = new URL(`https://${instance}/oauth/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set(
    "redirect_uri",
    process.env.MASTODON_REDIRECT_URI as string
  );
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "read");
  return url.toString();
}

/**
 * Get access token from Mastodon instance
 */
async function getAccessToken(
  instance: string,
  code: string,
  clientId: string,
  clientSecret: string
) {
  const response = await fetch(`https://${instance}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: process.env.MASTODON_REDIRECT_URI,
      grant_type: "authorization_code",
      code,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`);
  }

  return await response.json();
}

const mastodon = new Hono()
  // GET /api/mastodon/auth/authorize - Start Mastodon OAuth flow
  .get("/auth/authorize", zValidator("query", AuthorizeSchema), async (c) => {
    try {
      let { instance } = c.req.valid("query");

      // Clean up instance input
      instance = instance.toLowerCase().trim();

      if (instance.includes("https://")) {
        instance = instance.replace("https://", "");
      }

      if (instance.includes("/")) {
        instance = instance.split("/")[0];
      }

      if (instance.includes("@")) {
        instance = instance.split("@").at(-1) as string;
      }

      if (!instance.includes(".")) {
        return c.json(
          {
            error: "Invalid instance format",
            code: "instance",
          },
          400
        );
      }

      // Check if instance already exists
      let instanceData = await db.query.mastodonInstance.findFirst({
        where: eq(mastodonInstance.instance, instance),
      });

      // If not, register the app with the instance
      if (!instanceData) {
        try {
          const response = await fetch(`https://${instance}/api/v1/apps`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              client_name: "Sill",
              redirect_uris: process.env.MASTODON_REDIRECT_URI,
              scopes: "read",
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to register app: ${response.statusText}`);
          }

          const data = await response.json();

          const insert = await db
            .insert(mastodonInstance)
            .values({
              id: uuidv7(),
              instance: instance,
              clientId: data.client_id,
              clientSecret: data.client_secret,
            })
            .returning({
              id: mastodonInstance.id,
              instance: mastodonInstance.instance,
              clientId: mastodonInstance.clientId,
              clientSecret: mastodonInstance.clientSecret,
              createdAt: mastodonInstance.createdAt,
            });

          instanceData = insert[0];
        } catch (error) {
          console.error("Mastodon app registration error:", error);
          return c.json(
            {
              error: "Failed to register with instance",
              code: "instance",
            },
            400
          );
        }
      }

      const authorizationUrl = getAuthorizationUrl(
        instance,
        instanceData.clientId
      );

      return c.json({
        success: true,
        redirectUrl: authorizationUrl,
        instance: instance,
      });
    } catch (error) {
      console.error("Mastodon authorize error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // POST /api/mastodon/auth/callback - Handle Mastodon OAuth callback
  .post("/auth/callback", zValidator("json", CallbackSchema), async (c) => {
    try {
      const userId = await getUserIdFromSession(c.req.raw);
      if (!userId) {
        return c.json({ error: "Not authenticated" }, 401);
      }

      const { code, instance } = c.req.valid("json");

      const dbInstance = await db.query.mastodonInstance.findFirst({
        where: eq(mastodonInstance.instance, instance),
      });

      if (!dbInstance) {
        return c.json(
          {
            error: "Instance not found",
            code: "instance",
          },
          400
        );
      }

      // Get access token from Mastodon
      const tokenData = await getAccessToken(
        dbInstance.instance,
        code,
        dbInstance.clientId,
        dbInstance.clientSecret
      );

      // Save account to database
      await db.insert(mastodonAccount).values({
        id: uuidv7(),
        accessToken: tokenData.access_token,
        tokenType: tokenData.token_type,
        instanceId: dbInstance.id,
        userId: userId,
      });

      return c.json({
        success: true,
        account: {
          instance: dbInstance.instance,
          tokenType: tokenData.token_type,
        },
      });
    } catch (error) {
      console.error("Mastodon callback error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // POST /api/mastodon/auth/revoke - Revoke Mastodon access token and delete account
  .post("/auth/revoke", async (c) => {
    try {
      const userId = await getUserIdFromSession(c.req.raw);
      if (!userId) {
        return c.json({ error: "Not authenticated" }, 401);
      }

      // Get user's Mastodon account
      const userWithMastodon = await db.query.user.findFirst({
        where: eq(user.id, userId),
        with: {
          mastodonAccounts: {
            with: {
              mastodonInstance: true,
            },
          },
        },
      });

      if (!userWithMastodon || userWithMastodon.mastodonAccounts.length === 0) {
        return c.json(
          {
            error: "No Mastodon account found",
            code: "not_found",
          },
          404
        );
      }

      const mastodonAccountData = userWithMastodon.mastodonAccounts[0];
      const accessToken = mastodonAccountData.accessToken;
      const instance = mastodonAccountData.mastodonInstance.instance;

      // Revoke the token with Mastodon instance
      try {
        await fetch(`https://${instance}/oauth/revoke`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            client_id: mastodonAccountData.mastodonInstance.clientId,
            client_secret: mastodonAccountData.mastodonInstance.clientSecret,
            token: accessToken,
          }),
        });
      } catch (error) {
        console.error("Failed to revoke token with Mastodon:", error);
        // Continue to delete from database even if revoke fails
      }

      // Delete the Mastodon account from database
      await db
        .delete(mastodonAccount)
        .where(eq(mastodonAccount.userId, userId));

      return c.json({
        success: true,
        message: "Mastodon account revoked successfully",
      });
    } catch (error) {
      console.error("Mastodon revoke error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // GET /api/mastodon/lists - Get Mastodon lists for the authenticated user
  .get("/lists", async (c) => {
    try {
      const userId = await getUserIdFromSession(c.req.raw);
      if (!userId) {
        return c.json({ error: "Not authenticated" }, 401);
      }

      const account = await db.query.mastodonAccount.findFirst({
        where: eq(mastodonAccount.userId, userId),
        with: {
          mastodonInstance: true,
          lists: true,
        },
      });

      if (!account) {
        return c.json({ error: "Mastodon account not found" }, 404);
      }

      const lists = await getMastodonLists(account);
      return c.json({ lists });
    } catch (error) {
      console.error("Get Mastodon lists error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

export default mastodon;
