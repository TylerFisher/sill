import { S3Client } from "@aws-sdk/client-s3";
import { fromEnv } from "@aws-sdk/credential-providers";

export const s3 = new S3Client({
	credentials: fromEnv(),
	region: "auto",
	endpoint: process.env.S3_ENDPOINT_URL,
});

const bucket = process.env.S3_BUCKET;
// if (bucket == null) throw new Error("S3_BUCKET is required");
export const S3_BUCKET = bucket;

const urlBase = process.env.S3_URL_BASE;
// if (urlBase == null) throw new Error("S3_URL_BASE is required");
export const S3_URL_BASE = urlBase;
