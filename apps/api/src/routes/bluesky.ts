import {
  CompositeHandleResolver,
  WellKnownHandleResolver,
} from "@atcute/identity-resolver";
import { NodeDnsHandleResolver } from "@atcute/identity-resolver-node";
import { Agent } from "@atproto/api";
import {
  OAuthCallbackError,
  OAuthResolverError,
  OAuthResponseError,
  TokenRefreshError,
} from "@atproto/oauth-client-node";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { uuidv7 } from "uuidv7-js";
import { z } from "zod";
import {
  getUserIdFromSession,
  createOAuthClient,
  getSessionExpirationDate,
} from "@sill/auth";
import {
  db,
  blueskyAccount,
  user,
  session,
  termsAgreement,
  termsUpdate,
} from "@sill/schema";
import { eq, desc } from "drizzle-orm";
import { getBlueskyLists } from "@sill/links";
import { setSessionCookie } from "../utils/session.server.js";

const AuthorizeSchema = z.object({
  handle: z.string().optional(),
});

const bluesky = new Hono()
  // GET /api/bluesky/auth/authorize - Start Bluesky OAuth flow
  .get("/auth/authorize", zValidator("query", AuthorizeSchema), async (c) => {
    try {
      const oauthClient = await createOAuthClient(c.req.raw);
      let { handle } = c.req.valid("query");

      // If no handle provided, use default Bluesky social
      if (!handle) {
        const url = await oauthClient.authorize("https://bsky.social", {
          scope: "atproto transition:generic",
        });
        return c.json({
          success: true,
          redirectUrl: url.toString(),
        });
      }

      // Clean up handle
      handle = handle.trim();
      // Strip invisible Unicode control and format characters
      handle = handle.replace(/[\p{Cc}\p{Cf}]/gu, "");
      handle = handle.toLocaleLowerCase();

      if (handle.startsWith("@")) {
        handle = handle.slice(1);
      }

      if (handle.includes("@bsky.social")) {
        handle = handle.replace("@bsky.social", ".bsky.social");
      }

      if (handle.startsWith("https://bsky.app/profile/")) {
        handle = handle.slice("https://bsky.app/profile/".length);
      }

      if (!handle.includes(".") && !handle.startsWith("did:")) {
        handle = `${handle}.bsky.social`;
      }

      const resolver = new CompositeHandleResolver({
        strategy: "race",
        methods: {
          dns: new NodeDnsHandleResolver(),
          http: new WellKnownHandleResolver(),
        },
      });

      try {
        console.log("trying authorize");
        const url = await oauthClient.authorize(handle, {
          scope: "atproto transition:generic",
        });
        return c.json({
          success: true,
          redirectUrl: url.toString(),
        });
      } catch (error) {
        console.error("caught error", error);
        if (error instanceof OAuthResponseError) {
          const url = await oauthClient.authorize(handle, {
            scope: "atproto transition:generic",
          });
          return c.json({
            success: true,
            redirectUrl: url.toString(),
          });
        }

        if (error instanceof OAuthResolverError) {
          const did = await resolver.resolve(handle as `${string}.${string}`);
          if (did) {
            try {
              const url = await oauthClient.authorize(did, {
                scope: "atproto transition:generic",
              });
              return c.json({
                success: true,
                redirectUrl: url.toString(),
              });
            } catch {
              return c.json(
                {
                  error: "Failed to resolve handle",
                  code: "resolver",
                },
                400
              );
            }
          }
          return c.json(
            {
              error: "Failed to resolve handle",
              code: "resolver",
            },
            400
          );
        }
        throw error;
      }
    } catch (error) {
      console.error("Bluesky authorize error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // POST /api/bluesky/auth/callback - Handle Bluesky OAuth callback
  .post("/auth/callback", async (c) => {
    try {
      // Check if user is already authenticated (connecting account vs login/signup)
      let userId = await getUserIdFromSession(c.req.raw);
      const isLogin = !userId; // If no userId, this is a login/signup flow

      const body = await c.req.json();
      const searchParams = new URLSearchParams(body.searchParams);

      if (searchParams.get("error_description") === "Access denied") {
        return c.json(
          {
            error: "Access denied by user",
            code: "denied",
          },
          400
        );
      }

      if (searchParams.get("error")) {
        return c.json(
          {
            error: "OAuth error",
            code: "oauth",
          },
          400
        );
      }

      const oauthClient = await createOAuthClient(c.req.raw);

      try {
        const { session: oauthSession } = await oauthClient.callback(
          searchParams
        );
        const agent = new Agent(oauthSession);
        const profile = await agent.getProfile({
          actor: oauthSession.did,
        });

        // Handle login/signup flow (no existing user session)
        if (isLogin) {
          // Check if account already exists
          const existingAccount = await db.query.blueskyAccount.findFirst({
            where: eq(blueskyAccount.did, oauthSession.did),
          });

          if (existingAccount) {
            // User exists, log them in
            userId = existingAccount.userId;
          } else {
            // Create new user with Bluesky account
            const newUserId = uuidv7();

            // Get email from OAuth session (com.atproto.server.getSession)
            const atprotoSession = await agent.com.atproto.server.getSession();
            const email = atprotoSession.data.email;

            await db.transaction(async (tx) => {
              await tx.insert(user).values({
                id: newUserId,
                email: email!,
                name: profile.data.displayName || profile.data.handle,
                emailConfirmed: true, // Email from Bluesky OAuth is confirmed
                freeTrialEnd: new Date(
                  Date.now() + 1000 * 60 * 60 * 24 * 14
                ).toISOString(),
              });

              await tx.insert(blueskyAccount).values({
                id: uuidv7(),
                did: oauthSession.did,
                handle: profile.data.handle,
                userId: newUserId,
                service: oauthSession.serverMetadata.issuer,
                authErrorNotificationSent: false,
              });

              // Agree to latest terms
              const latestTerms = await tx.query.termsUpdate.findFirst({
                orderBy: desc(termsUpdate.termsDate),
              });

              if (latestTerms) {
                await tx.insert(termsAgreement).values({
                  id: uuidv7(),
                  userId: newUserId,
                  termsUpdateId: latestTerms.id,
                });
              }
            });

            userId = newUserId;
          }

          // Create session for login
          const newSession = await db
            .insert(session)
            .values({
              id: uuidv7(),
              expirationDate: getSessionExpirationDate(),
              userId: userId,
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
              did: oauthSession.did,
              handle: profile.data.handle,
              service: oauthSession.serverMetadata.issuer,
            },
          });
        }

        // Handle connect flow (existing user session)
        await db
          .insert(blueskyAccount)
          .values({
            id: uuidv7(),
            did: oauthSession.did,
            handle: profile.data.handle,
            userId: userId!,
            service: oauthSession.serverMetadata.issuer,
            authErrorNotificationSent: false,
          })
          .onConflictDoUpdate({
            target: blueskyAccount.did,
            set: {
              handle: profile.data.handle,
              service: oauthSession.serverMetadata.issuer,
              authErrorNotificationSent: false,
              userId: userId!, // Update userId in case account was previously linked to another user
            },
          });

        return c.json({
          success: true,
          isLogin: false,
          account: {
            did: oauthSession.did,
            handle: profile.data.handle,
            service: oauthSession.serverMetadata.issuer,
          },
        });
      } catch (error) {
        if (
          error instanceof OAuthCallbackError &&
          ["login_required", "consent_required"].includes(
            error.params.get("error") || ""
          )
        ) {
          if (error.state) {
            const { user, handle } = JSON.parse(error.state);
            const url = await oauthClient.authorize(handle, {
              state: JSON.stringify({
                user,
                handle,
              }),
            });

            return c.json(
              {
                error: "Login required",
                code: "login_required",
                redirectUrl: url.toString(),
              },
              400
            );
          }
        }

        // Fallback - try callback again
        const { session: oauthSession } = await oauthClient.callback(
          searchParams
        );
        const agent = new Agent(oauthSession);
        const profile = await agent.getProfile({
          actor: oauthSession.did,
        });

        console.error("Bluesky OAuth Error (handled with retry):", {
          error: String(error),
        });

        // Handle login flow in retry
        if (isLogin) {
          const existingAccount = await db.query.blueskyAccount.findFirst({
            where: eq(blueskyAccount.did, oauthSession.did),
          });

          if (existingAccount) {
            userId = existingAccount.userId;
          } else {
            const newUserId = uuidv7();
            // Get email from OAuth session (com.atproto.server.getSession)
            const atprotoSession = await agent.com.atproto.server.getSession();
            const email = atprotoSession.data.email;

            await db.transaction(async (tx) => {
              await tx.insert(user).values({
                id: newUserId,
                email: email!,
                name: profile.data.displayName || profile.data.handle,
                emailConfirmed: true,
                freeTrialEnd: new Date(
                  Date.now() + 1000 * 60 * 60 * 24 * 14
                ).toISOString(),
              });

              await tx.insert(blueskyAccount).values({
                id: uuidv7(),
                did: oauthSession.did,
                handle: profile.data.handle,
                userId: newUserId,
                service: oauthSession.serverMetadata.issuer,
                authErrorNotificationSent: false,
              });

              const latestTerms = await tx.query.termsUpdate.findFirst({
                orderBy: desc(termsUpdate.termsDate),
              });

              if (latestTerms) {
                await tx.insert(termsAgreement).values({
                  id: uuidv7(),
                  userId: newUserId,
                  termsUpdateId: latestTerms.id,
                });
              }
            });
            userId = newUserId;
          }

          const newSession = await db
            .insert(session)
            .values({
              id: uuidv7(),
              expirationDate: getSessionExpirationDate(),
              userId: userId,
            })
            .returning({
              id: session.id,
              expirationDate: session.expirationDate,
            });

          setSessionCookie(c, newSession[0].id, newSession[0].expirationDate);

          return c.json({
            success: true,
            isLogin: true,
            account: {
              did: oauthSession.did,
              handle: profile.data.handle,
              service: oauthSession.serverMetadata.issuer,
            },
          });
        }

        // Handle connect flow in retry
        await db
          .insert(blueskyAccount)
          .values({
            id: uuidv7(),
            did: oauthSession.did,
            handle: profile.data.handle,
            userId: userId!,
            service: oauthSession.serverMetadata.issuer,
            authErrorNotificationSent: false,
          })
          .onConflictDoUpdate({
            target: blueskyAccount.did,
            set: {
              handle: profile.data.handle,
              service: oauthSession.serverMetadata.issuer,
              authErrorNotificationSent: false,
              userId: userId!,
            },
          });

        return c.json({
          success: true,
          isLogin: false,
          account: {
            did: oauthSession.did,
            handle: profile.data.handle,
            service: oauthSession.serverMetadata.issuer,
          },
        });
      }
    } catch (error) {
      console.error("Bluesky callback error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  .delete("/auth/revoke", async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);
    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    try {
      await db.delete(blueskyAccount).where(eq(blueskyAccount.userId, userId));

      return c.json({
        success: true,
      });
    } catch (error) {
      console.error("Bluesky revoke error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // GET /api/bluesky/lists - Get Bluesky lists for the authenticated user
  .get("/lists", async (c) => {
    try {
      const userId = await getUserIdFromSession(c.req.raw);
      if (!userId) {
        return c.json({ error: "Not authenticated" }, 401);
      }

      const account = await db.query.blueskyAccount.findFirst({
        where: eq(blueskyAccount.userId, userId),
        with: {
          lists: true,
        },
      });

      if (!account) {
        return c.json({ error: "Bluesky account not found" }, 404);
      }

      const lists = await getBlueskyLists(account);
      return c.json({ lists });
    } catch (error) {
      console.error("Get Bluesky lists error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // GET /api/bluesky/auth/status - Check Bluesky OAuth status and refresh if needed
  .get("/auth/status", async (c) => {
    try {
      const userId = await getUserIdFromSession(c.req.raw);
      if (!userId) {
        return c.json({ error: "Not authenticated" }, 401);
      }

      const account = await db.query.blueskyAccount.findFirst({
        where: eq(blueskyAccount.userId, userId),
      });

      if (!account) {
        return c.json({
          status: "not_connected",
          needsAuth: false,
        });
      }

      try {
        const client = await createOAuthClient(c.req.raw);
        await client.restore(account.did);

        return c.json({
          status: "connected",
          needsAuth: false,
          account: {
            did: account.did,
            handle: account.handle,
          },
        });
      } catch (error) {
        if (
          error instanceof TokenRefreshError ||
          (error instanceof Error &&
            error.constructor.name === "TokenRefreshError")
        ) {
          // Token refresh failed, need to re-authorize
          const client = await createOAuthClient(c.req.raw);
          try {
            const url = await client.authorize(account.handle, {
              scope: "atproto transition:generic",
            });
            return c.json({
              status: "needs_reauth",
              needsAuth: true,
              redirectUrl: url.toString(),
            });
          } catch (authError) {
            // Try with DID if handle fails
            try {
              const url = await client.authorize(account.did, {
                scope: "atproto transition:generic",
              });
              return c.json({
                status: "needs_reauth",
                needsAuth: true,
                redirectUrl: url.toString(),
              });
            } catch {
              return c.json(
                {
                  status: "error",
                  needsAuth: true,
                  error: "Failed to initiate re-authorization",
                },
                500
              );
            }
          }
        }

        if (error instanceof OAuthResponseError) {
          // Try again after catching OAuthResponseError
          try {
            const client = await createOAuthClient(c.req.raw);
            await client.restore(account.did);

            return c.json({
              status: "connected",
              needsAuth: false,
              account: {
                did: account.did,
                handle: account.handle,
              },
            });
          } catch (retryError) {
            console.error("Bluesky status check retry error:", retryError);
            // Fall through to check other error types
            if (
              retryError instanceof TokenRefreshError ||
              (retryError instanceof Error &&
                retryError.constructor.name === "TokenRefreshError")
            ) {
              const client = await createOAuthClient(c.req.raw);
              try {
                const url = await client.authorize(account.handle, {
                  scope: "atproto transition:generic",
                });
                return c.json({
                  status: "needs_reauth",
                  needsAuth: true,
                  redirectUrl: url.toString(),
                });
              } catch (authError) {
                // Try with DID if handle fails
                try {
                  const url = await client.authorize(account.did, {
                    scope: "atproto transition:generic",
                  });
                  return c.json({
                    status: "needs_reauth",
                    needsAuth: true,
                    redirectUrl: url.toString(),
                  });
                } catch {
                  return c.json(
                    {
                      status: "error",
                      needsAuth: true,
                      error: "Failed to initiate re-authorization",
                    },
                    500
                  );
                }
              }
            }
          }
        }

        if (error instanceof OAuthResolverError) {
          return c.json(
            {
              status: "error",
              needsAuth: true,
              error: "resolver",
            },
            400
          );
        }

        throw error;
      }
    } catch (error) {
      console.error("Bluesky status check error:", error);
      return c.json(
        {
          status: "error",
          needsAuth: false,
          error: "Internal server error",
        },
        500
      );
    }
  });

export default bluesky;
