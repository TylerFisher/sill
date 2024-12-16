import type { Route } from "./+types/client-metadata";
import { createOAuthClient } from "~/server/oauth/client";

export const headers: Route.HeadersFunction = () => ({
	"Content-Type": "application/json",
	"Cache-Control": "public, max-age=3600",
});

export const loader = async () => {
	const oauthClient = await createOAuthClient();
	return Response.json(oauthClient.clientMetadata);
};
