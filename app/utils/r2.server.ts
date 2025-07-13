import {
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";

interface R2Config {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucketName: string;
}

class R2Client {
	private s3Client: S3Client;
	private bucketName: string;

	constructor(config: R2Config) {
		this.s3Client = new S3Client({
			region: "auto",
			endpoint: `https://${config.accountId}.eu.r2.cloudflarestorage.com`,
			credentials: {
				accessKeyId: config.accessKeyId,
				secretAccessKey: config.secretAccessKey,
			},
		});
		this.bucketName = config.bucketName;
	}

	async uploadFile(
		key: string,
		data: Buffer,
		metadata: Record<string, string> = {},
	): Promise<void> {
		const command = new PutObjectCommand({
			Bucket: this.bucketName,
			Key: key,
			Body: data,
			Metadata: metadata,
			ContentType: "application/octet-stream",
		});

		await this.s3Client.send(command);
	}

	async verifyUpload(key: string): Promise<boolean> {
		try {
			const command = new HeadObjectCommand({
				Bucket: this.bucketName,
				Key: key,
			});
			await this.s3Client.send(command);
			return true;
		} catch {
			return false;
		}
	}

	generateArchiveKey(partitionName: string, date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");

		return `partitions/year=${year}/month=${month}/day=${day}/${partitionName}.parquet`;
	}
}

// Singleton instance
let r2Client: R2Client | null = null;

export function getR2Client(): R2Client {
	if (!r2Client) {
		const config: R2Config = {
			accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
			accessKeyId: process.env.R2_ACCESS_KEY_ID!,
			secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
			bucketName: process.env.R2_BUCKET_NAME!,
		};

		// Validate required environment variables
		for (const [key, value] of Object.entries(config)) {
			if (!value) {
				throw new Error(`Missing required environment variable for R2: ${key}`);
			}
		}

		r2Client = new R2Client(config);
	}

	return r2Client;
}
