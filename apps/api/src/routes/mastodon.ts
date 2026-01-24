import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { uuidv7 } from "uuidv7-js";
import { z } from "zod";
import { getUserIdFromSession, getSessionExpirationDate } from "@sill/auth";
import {
  db,
  mastodonAccount,
  mastodonInstance,
  session,
  user,
  termsAgreement,
  termsUpdate,
} from "@sill/schema";
import { getMastodonLists } from "@sill/links";
import { setSessionCookie } from "../utils/session.server.js";

const AuthorizeSchema = z.object({
  instance: z.string().min(1),
  mode: z.enum(["login", "signup"]).optional(),
});

const CallbackSchema = z.object({
  code: z.string().min(1),
  instance: z.string().min(1),
  mode: z.enum(["login", "signup"]).optional(),
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

/**
 * Get account info from Mastodon instance using access token
 */
async function getMastodonAccountInfo(
  instance: string,
  accessToken: string
): Promise<{ id: string; username: string; display_name: string }> {
  const response = await fetch(
    `https://${instance}/api/v1/accounts/verify_credentials`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get account info: ${response.statusText}`);
  }

  return await response.json();
}

const mastodon = new Hono()
  // GET /api/mastodon/auth/authorize - Start Mastodon OAuth flow
  .get("/auth/authorize", zValidator("query", AuthorizeSchema), async (c) => {
    try {
      let { instance, mode } = c.req.valid("query");
      const isSignup = mode === "signup";

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
        mode: mode,
      });
    } catch (error) {
      console.error("Mastodon authorize error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // POST /api/mastodon/auth/callback - Handle Mastodon OAuth callback
  .post("/auth/callback", zValidator("json", CallbackSchema), async (c) => {
    try {
      // Check if user is already authenticated (connecting account vs login/signup)
      const userId = await getUserIdFromSession(c.req.raw);
      const isLogin = !userId; // If no userId, this is a login/signup flow

      const { code, instance, mode } = c.req.valid("json");
      const isSignup = mode === "signup";

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

      // Get account info from Mastodon
      const accountInfo = await getMastodonAccountInfo(
        dbInstance.instance,
        tokenData.access_token
      );

      // Handle login/signup flow (no existing user session)
      if (isLogin) {
        // Check if account already exists by mastodonId and instanceId
        let existingAccount = await db.query.mastodonAccount.findFirst({
          where: and(
            eq(mastodonAccount.instanceId, dbInstance.id),
            eq(mastodonAccount.mastodonId, accountInfo.id)
          ),
        });

        // If not found, check for legacy accounts without mastodonId
        // These are accounts created before we stored mastodonId
        if (!existingAccount) {
          const legacyAccounts = await db.query.mastodonAccount.findMany({
            where: and(
              eq(mastodonAccount.instanceId, dbInstance.id),
              sql`${mastodonAccount.mastodonId} IS NULL`
            ),
          });

          // For each legacy account, verify if it belongs to the same Mastodon user
          for (const legacyAccount of legacyAccounts) {
            try {
              const legacyAccountInfo = await getMastodonAccountInfo(
                dbInstance.instance,
                legacyAccount.accessToken
              );
              if (legacyAccountInfo.id === accountInfo.id) {
                // Found the matching legacy account - update it with mastodonId
                await db
                  .update(mastodonAccount)
                  .set({
                    mastodonId: accountInfo.id,
                    username: accountInfo.username,
                  })
                  .where(eq(mastodonAccount.id, legacyAccount.id));
                existingAccount = legacyAccount;
                break;
              }
            } catch {
              // Token might be expired/invalid, continue to next
            }
          }
        }

        if (!existingAccount) {
          // No existing account
          if (isSignup) {
            // Signup flow: Create new user
            const transaction = await db.transaction(async (tx) => {
              // Create user without email
              const newUser = await tx
                .insert(user)
                .values({
                  id: uuidv7(),
                  email: null,
                  name: accountInfo.display_name || accountInfo.username,
                  emailConfirmed: false,
                  freeTrialEnd: new Date(
                    Date.now() + 1000 * 60 * 60 * 24 * 14
                  ).toISOString(),
                })
                .returning({ id: user.id });

              // Create mastodon account
              await tx.insert(mastodonAccount).values({
                id: uuidv7(),
                instanceId: dbInstance.id,
                mastodonId: accountInfo.id,
                username: accountInfo.username,
                accessToken: tokenData.access_token,
                tokenType: tokenData.token_type,
                userId: newUser[0].id,
              });

              // Create terms agreement
              const latestTerms = await tx.query.termsUpdate.findFirst({
                orderBy: desc(termsUpdate.termsDate),
              });
              if (latestTerms) {
                await tx.insert(termsAgreement).values({
                  id: uuidv7(),
                  userId: newUser[0].id,
                  termsUpdateId: latestTerms.id,
                });
              }

              // Create session
              const newSession = await tx
                .insert(session)
                .values({
                  id: uuidv7(),
                  expirationDate: getSessionExpirationDate(),
                  userId: newUser[0].id,
                })
                .returning({
                  id: session.id,
                  expirationDate: session.expirationDate,
                });

              return { user: newUser[0], session: newSession[0] };
            });

            // Set session cookie
            setSessionCookie(
              c,
              transaction.session.id,
              transaction.session.expirationDate
            );

            return c.json({
              success: true,
              isSignup: true,
              account: {
                instance: dbInstance.instance,
                username: accountInfo.username,
              },
            });
          }

          // Login flow but no account found - reject
          return c.json(
            {
              error: "No account found with this Mastodon account.",
              code: "account_not_found",
            },
            404
          );
        }

        // Account exists - log them in
        // Update the access token
        await db
          .update(mastodonAccount)
          .set({
            accessToken: tokenData.access_token,
            tokenType: tokenData.token_type,
            username: accountInfo.username,
          })
          .where(eq(mastodonAccount.id, existingAccount.id));

        // Create a session for the user
        const newSession = await db
          .insert(session)
          .values({
            id: uuidv7(),
            expirationDate: getSessionExpirationDate(),
            userId: existingAccount.userId,
          })
          .returning({
            id: session.id,
            expirationDate: session.expirationDate,
          });

        // Set session cookie
        setSessionCookie(c, newSession[0].id, newSession[0].expirationDate);

        return c.json({
          success: true,
          isLogin: true,
          account: {
            instance: dbInstance.instance,
            username: accountInfo.username,
          },
        });
      }

      // User is already logged in - connecting account
      // Save account to database with mastodonId and username
      await db.insert(mastodonAccount).values({
        id: uuidv7(),
        instanceId: dbInstance.id,
        mastodonId: accountInfo.id,
        username: accountInfo.username,
        accessToken: tokenData.access_token,
        tokenType: tokenData.token_type,
        userId: userId,
      });

      return c.json({
        success: true,
        account: {
          instance: dbInstance.instance,
          username: accountInfo.username,
        },
      });
    } catch (error) {
      console.error("Mastodon callback error:", error);
      // Return more specific error information
      if (error instanceof Error) {
        if (error.message.includes("access token")) {
          return c.json({ error: "Failed to authenticate with Mastodon. Please try again.", code: "token_error" }, 400);
        }
        if (error.message.includes("account info")) {
          return c.json({ error: "Failed to get account information from Mastodon.", code: "account_error" }, 400);
        }
      }
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
