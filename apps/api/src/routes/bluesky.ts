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
} from "@atproto/oauth-client-node";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { uuidv7 } from "uuidv7-js";
import { z } from "zod";
import { getUserIdFromSession, createOAuthClient } from "@sill/auth";
import { db, blueskyAccount } from "@sill/schema";
import { eq } from "drizzle-orm";
import { getBlueskyLists } from "@sill/links";

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
      const userId = await getUserIdFromSession(c.req.raw);
      if (!userId) {
        return c.json({ error: "Not authenticated" }, 401);
      }

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

        await db
          .insert(blueskyAccount)
          .values({
            id: uuidv7(),
            did: oauthSession.did,
            handle: profile.data.handle,
            userId: userId,
            service: oauthSession.serverMetadata.issuer,
          })
          .onConflictDoUpdate({
            target: blueskyAccount.did,
            set: {
              handle: profile.data.handle,
              service: oauthSession.serverMetadata.issuer,
            },
          });

        return c.json({
          success: true,
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

        await db
          .insert(blueskyAccount)
          .values({
            id: uuidv7(),
            did: oauthSession.did,
            handle: profile.data.handle,
            userId: userId,
            service: oauthSession.serverMetadata.issuer,
          })
          .onConflictDoUpdate({
            target: blueskyAccount.did,
            set: {
              handle: profile.data.handle,
              service: oauthSession.serverMetadata.issuer,
            },
          });

        console.error("Bluesky OAuth Error (handled):", {
          error: String(error),
        });
        return c.json({
          success: true,
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
  });

export default bluesky;
