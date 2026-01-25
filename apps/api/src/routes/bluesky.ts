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
  session,
  user,
  termsAgreement,
  termsUpdate,
} from "@sill/schema";
import { and, desc, eq, ne } from "drizzle-orm";
import { getBlueskyLists } from "@sill/links";
import { setSessionCookie } from "../utils/session.server.js";

const AuthorizeSchema = z.object({
  handle: z.string().optional(),
  mode: z.enum(["login", "signup"]).optional(),
});

const bluesky = new Hono()
  // GET /api/bluesky/auth/authorize - Start Bluesky OAuth flow
  .get("/auth/authorize", zValidator("query", AuthorizeSchema), async (c) => {
    try {
      const oauthClient = await createOAuthClient(c.req.raw);
      let { handle, mode } = c.req.valid("query");
      const isSignup = mode === "signup";

      // Check if user is already authenticated
      const userId = await getUserIdFromSession(c.req.raw);
      const isLogin = !userId;

      // If this is a login/signup attempt (no user session), we need a handle
      if (isLogin) {
        // If no handle provided, return error
        if (!handle) {
          return c.json(
            {
              error: "Handle is required",
              code: "handle_required",
            },
            400
          );
        }
      }

      // For connecting an account (user already logged in), allow without handle
      if (!isLogin && !handle) {
        const url = await oauthClient.authorize("https://bsky.social", {
          scope: "atproto transition:generic",
        });
        return c.json({
          success: true,
          redirectUrl: url.toString(),
        });
      }

      // Clean up handle
      handle = handle!.trim();
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

      // For connect flow, check if account is already linked to another user
      if (!isLogin && userId) {
        try {
          const did = await resolver.resolve(handle as `${string}.${string}`);
          if (did) {
            const existingAccount = await db.query.blueskyAccount.findFirst({
              where: and(
                eq(blueskyAccount.did, did),
                ne(blueskyAccount.userId, userId)
              ),
            });

            if (existingAccount) {
              return c.json(
                {
                  error: "This Bluesky account is already linked to another user.",
                  code: "account_exists",
                },
                400
              );
            }
          }
        } catch {
          // If we can't resolve the DID, let the OAuth flow handle it
        }
      }

      // Build OAuth options
      const oauthOptions = {
        scope: "atproto transition:generic",
      };

      try {
        console.log("trying authorize");
        const url = await oauthClient.authorize(handle, oauthOptions);
        return c.json({
          success: true,
          redirectUrl: url.toString(),
        });
      } catch (error) {
        console.error("caught error", error);
        if (error instanceof OAuthResponseError) {
          const url = await oauthClient.authorize(handle, oauthOptions);
          return c.json({
            success: true,
            redirectUrl: url.toString(),
          });
        }

        if (error instanceof OAuthResolverError) {
          const did = await resolver.resolve(handle as `${string}.${string}`);
          if (did) {
            try {
              const url = await oauthClient.authorize(did, oauthOptions);
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

      // Get mode from request body (passed from web app which stored it in session)
      const isSignup = body.mode === "signup";

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

          if (!existingAccount) {
            // No existing account - create new user
            const transaction = await db.transaction(async (tx) => {
              // Create user without email
              const newUser = await tx
                .insert(user)
                .values({
                  id: uuidv7(),
                  email: null,
                  name: profile.data.displayName || profile.data.handle,
                  emailConfirmed: false,
                  freeTrialEnd: new Date(
                    Date.now() + 1000 * 60 * 60 * 24 * 14
                  ).toISOString(),
                })
                .returning({ id: user.id });

              // Create bluesky account
              await tx.insert(blueskyAccount).values({
                id: uuidv7(),
                did: oauthSession.did,
                handle: profile.data.handle,
                userId: newUser[0].id,
                service: oauthSession.serverMetadata.issuer,
                authErrorNotificationSent: false,
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
                did: oauthSession.did,
                handle: profile.data.handle,
                service: oauthSession.serverMetadata.issuer,
              },
            });
          }

          // User exists, log them in
          userId = existingAccount.userId;

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

        // Handle login/signup flow in retry
        if (isLogin) {
          const existingAccount = await db.query.blueskyAccount.findFirst({
            where: eq(blueskyAccount.did, oauthSession.did),
          });

          if (!existingAccount) {
            if (isSignup) {
              // Signup flow in retry: Create new user
              const transaction = await db.transaction(async (tx) => {
                const newUser = await tx
                  .insert(user)
                  .values({
                    id: uuidv7(),
                    email: null,
                    name: profile.data.displayName || profile.data.handle,
                    emailConfirmed: false,
                    freeTrialEnd: new Date(
                      Date.now() + 1000 * 60 * 60 * 24 * 14
                    ).toISOString(),
                  })
                  .returning({ id: user.id });

                await tx.insert(blueskyAccount).values({
                  id: uuidv7(),
                  did: oauthSession.did,
                  handle: profile.data.handle,
                  userId: newUser[0].id,
                  service: oauthSession.serverMetadata.issuer,
                  authErrorNotificationSent: false,
                });

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

              setSessionCookie(
                c,
                transaction.session.id,
                transaction.session.expirationDate
              );

              return c.json({
                success: true,
                isSignup: true,
                account: {
                  did: oauthSession.did,
                  handle: profile.data.handle,
                  service: oauthSession.serverMetadata.issuer,
                },
              });
            }

            // No account found - reject login
            return c.json(
              {
                error: "No account found with this Bluesky account.",
                code: "account_not_found",
              },
              404
            );
          }

          userId = existingAccount.userId;

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
