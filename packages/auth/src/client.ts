import { JoseKey } from "@atproto/jwk-jose";
import { NodeOAuthClient } from "@atproto/oauth-client-node";
import { SessionStore, StateStore } from "./storage.js";

let oauthClient: NodeOAuthClient | null = null;
const isProduction = process.env.NODE_ENV === "production";

/**
 * Creates an OAuth client for Bluesky
 * @param request Optional request to extract domain from
 * @returns OAuth client for Bluesky
 */
export const createOAuthClient = async (request?: Request) => {
  if (oauthClient) {
    return oauthClient;
  }

  // Determine base URL from request or environment
  // Note: Bluesky OAuth doesn't allow "localhost" so we use 127.0.0.1 in development
  let baseUrl: string;
  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || "http";
    if (forwardedHost) {
      // Replace localhost with 127.0.0.1 for Bluesky OAuth compatibility
      const cleanHost = forwardedHost.replace("localhost", "127.0.0.1");
      baseUrl = `${forwardedProto}://${cleanHost}`;
    } else {
      baseUrl = new URL(request.url).origin.replace("localhost", "127.0.0.1");
    }
  } else {
    baseUrl = isProduction
      ? (process.env.PUBLIC_URL as string)
      : "http://127.0.0.1:3000";
  }

  const privateKeyPKCS8 = Buffer.from(
    process.env.PRIVATE_KEY_ES256_B64 as string,
    "base64",
  ).toString();
  const privateKey = await JoseKey.fromImportable(privateKeyPKCS8, "key1");
  const enc = encodeURIComponent;
  oauthClient = new NodeOAuthClient({
    clientMetadata: {
      client_name: "Sill",
      client_id: isProduction
        ? `${process.env.PUBLIC_URL}/client-metadata.json`
        : `http://localhost?redirect_uri=${enc(
            `${baseUrl}/bluesky/auth/callback`,
          )}&scope=${enc("atproto transition:generic")}`,
      client_uri: process.env.PUBLIC_URL,
      jwks_uri: `${baseUrl}/jwks.json`,
      redirect_uris: [`${baseUrl}/bluesky/auth/callback`],
      scope: "atproto transition:generic",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      application_type: "web",
      token_endpoint_auth_method: "private_key_jwt",
      token_endpoint_auth_signing_alg: "ES256",
      dpop_bound_access_tokens: true,
    },
    keyset: [privateKey],
    stateStore: new StateStore(),
    sessionStore: new SessionStore(),
  });
  return oauthClient;
};
