import express from "express";

import { createOAuthClient } from "./client";

const router = express.Router();

router.get("/client-metadata.json", async (_req, res) => {
	const oauthClient = await createOAuthClient();
	return res.json(oauthClient.clientMetadata);
});

router.get("/jwks.json", async (_req, res) => {
	const oauthClient = await createOAuthClient();
	return res.json(oauthClient.jwks);
});

export { router as oauthRouter };
