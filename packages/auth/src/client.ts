import { JoseKey } from "@atproto/jwk-jose";
import { NodeOAuthClient } from "@atproto/oauth-client-node";
import { eq } from "drizzle-orm";
import { blueskyAccount, db } from "@sill/schema";
import { SessionStore, StateStore } from "./storage.js";

export type AuthVariant = "v1" | "v2";

const V1_SCOPE = "atproto transition:generic";
// The include:app.bsky.authViewAll scope is bound to the #bsky_appview aud,
// but a known Bluesky bug breaks service-proxying permission validation for
// the "pipethrough" path (only the read-after-write path works). The team's
// workaround until the spec rework lands is to add explicit rpc:<lxm>?aud=*
// scopes for each appview RPC the app actually calls. The list below covers
// every appview RPC Sill invokes via the agent — when adding a new
// agent.app.bsky.* / agent.getX call, add the matching rpc scope here too.
const V2_APPVIEW_RPCS = [
  "app.bsky.actor.getPreferences",
  "app.bsky.actor.getProfile",
  "app.bsky.feed.getFeed",
  "app.bsky.feed.getFeedGenerator",
  "app.bsky.feed.getListFeed",
  "app.bsky.feed.getTimeline",
  "app.bsky.graph.getFollows",
  "app.bsky.graph.getList",
];
const V2_SCOPE = [
  "atproto",
  "include:app.bsky.authViewAll?aud=did:web:api.bsky.app%23bsky_appview",
  ...V2_APPVIEW_RPCS.map((lxm) => `rpc:${lxm}?aud=*`),
  "repo:community.lexicon.bookmarks.bookmark",
].join(" ");

const isProduction = process.env.NODE_ENV === "production";

const oauthClients: Partial<Record<AuthVariant, NodeOAuthClient>> = {};

const scopeFor = (variant: AuthVariant) =>
  variant === "v1" ? V1_SCOPE : V2_SCOPE;

const metadataPathFor = (variant: AuthVariant) =>
  variant === "v1" ? "/client-metadata.json" : "/oauth-client-metadata.json";

const resolveBaseUrl = (request?: Request): string => {
  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || "http";
    if (forwardedHost) {
      const cleanHost = forwardedHost.replace("localhost", "127.0.0.1");
      return `${forwardedProto}://${cleanHost}`;
    }
    return new URL(request.url).origin.replace("localhost", "127.0.0.1");
  }
  return isProduction
    ? (process.env.PUBLIC_URL as string)
    : "http://127.0.0.1:3000";
};

const clientIdFor = (variant: AuthVariant, baseUrl: string): string => {
  const scope = scopeFor(variant);
  if (isProduction) {
    return `${process.env.PUBLIC_URL}${metadataPathFor(variant)}`;
  }
  const enc = encodeURIComponent;
  return `http://localhost?redirect_uri=${enc(
    `${baseUrl}/bluesky/auth/callback`,
  )}&scope=${enc(scope)}`;
};

/**
 * Creates an OAuth client for Bluesky for the given scope variant.
 *
 * v1 (legacy): scope "atproto transition:generic". Used by the worker for
 *   accounts that haven't re-authenticated since the v2 rollout.
 * v2 (current): scope "atproto include:app.bsky.authViewAll repo:community.lexicon.bookmarks.bookmark".
 *   Used by every API route; forcing v2 on every web-app interaction is the
 *   migration mechanism.
 *
 * Two clients run side-by-side. SessionStore/StateStore instances are
 * namespaced by client_id so their rows never collide.
 */
export const createOAuthClient = async (
  variant: AuthVariant,
  request?: Request,
): Promise<NodeOAuthClient> => {
  const existing = oauthClients[variant];
  if (existing) {
    return existing;
  }

  const baseUrl = resolveBaseUrl(request);
  const clientId = clientIdFor(variant, baseUrl);

  const privateKeyPKCS8 = Buffer.from(
    process.env.PRIVATE_KEY_ES256_B64 as string,
    "base64",
  ).toString();
  const privateKey = await JoseKey.fromImportable(privateKeyPKCS8, "key1");

  const client = new NodeOAuthClient({
    clientMetadata: {
      client_name: "Sill",
      client_id: clientId,
      client_uri: process.env.PUBLIC_URL,
      jwks_uri: `${baseUrl}/jwks.json`,
      redirect_uris: [`${baseUrl}/bluesky/auth/callback`],
      scope: scopeFor(variant),
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      application_type: "web",
      token_endpoint_auth_method: "private_key_jwt",
      token_endpoint_auth_signing_alg: "ES256",
      dpop_bound_access_tokens: true,
    },
    keyset: [privateKey],
    stateStore: new StateStore(clientId),
    sessionStore: new SessionStore(clientId),
  });

  oauthClients[variant] = client;
  return client;
};

/**
 * Looks up the stored auth variant for an account by DID. Returns 'v1' if the
 * account is unknown — defensive default that matches pre-migration rows.
 */
export const getVariantForAccount = async (
  did: string,
): Promise<AuthVariant> => {
  const row = await db.query.blueskyAccount.findFirst({
    where: eq(blueskyAccount.did, did),
    columns: { authVariant: true },
  });
  return (row?.authVariant ?? "v1") as AuthVariant;
};
