import { NodeOAuthClient } from "@atproto/oauth-client-node";
/**
 * Creates an OAuth client for Bluesky
 * @param request Optional request to extract domain from
 * @returns OAuth client for Bluesky
 */
export declare const createOAuthClient: (request?: Request) => Promise<NodeOAuthClient>;
