import { createOAuthClient } from "~/server/oauth/client";

export const loader = async () => {
	const oauthClient = await createOAuthClient();
	return oauthClient.clientMetadata;
};
