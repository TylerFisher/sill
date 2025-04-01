import { JoseKey } from "@atproto/jwk-jose";
import { NodeOAuthClient, type RuntimeLock } from "@atproto/oauth-client-node";
import { SessionStore, StateStore } from "./storage";
import { sql } from "drizzle-orm";
import { db } from "~/drizzle/db.server";

let oauthClient: NodeOAuthClient | null = null;
const isProduction = process.env.NODE_ENV === "production";

/**
 * Creates an OAuth client for Bluesky
 * @returns OAuth client for Bluesky
 */
export const createOAuthClient = async () => {
	if (oauthClient) {
		return oauthClient;
	}
	const baseUrl = isProduction
		? process.env.PUBLIC_URL
		: "http://127.0.0.1:3000";
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
				: `http://localhost?redirect_uri=${enc(`${baseUrl}/bluesky/auth/callback`)}&scope=${enc("atproto transition:generic")}`,
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
		requestLock,
	});
	return oauthClient;
};

// Helper to convert string key to bigint for pg_advisory_xact_lock
function stringToHash(str: string): bigint {
	let hash = 0n;
	for (let i = 0; i < str.length; i++) {
		hash = (hash * 31n + BigInt(str.charCodeAt(i))) % 2n ** 63n;
	}
	return hash;
}

export const requestLock: RuntimeLock = async (key, fn) => {
	return await db.transaction(async (tx) => {
		const lockId = stringToHash(key);

		await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockId})`);

		try {
			return await fn();
		} finally {
			// Lock is automatically released when transaction commits/rolls back
			// No explicit unlock needed with pg_advisory_xact_lock
		}
	});
};
