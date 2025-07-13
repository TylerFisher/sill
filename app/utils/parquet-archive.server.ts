import type { WriteStream } from "node:fs";
import { ParquetSchema, ParquetWriter } from "@dsnp/parquetjs";
import { sql } from "drizzle-orm";
import { db } from "~/drizzle/db.server";
import type { linkPostDenormalized } from "~/drizzle/schema.server";

type LinkPostRecord = typeof linkPostDenormalized.$inferSelect;

const parquetSchema = new ParquetSchema({
	id: { type: "UTF8" },
	linkUrl: { type: "UTF8" },
	postUrl: { type: "UTF8" },
	postText: { type: "UTF8" },
	postDate: { type: "TIMESTAMP_MILLIS" },
	postType: { type: "UTF8" },
	postImages: {
		optional: true,
		repeated: true,
		fields: {
			url: { type: "UTF8" },
			alt: { type: "UTF8" },
		},
	},
	actorUrl: { type: "UTF8" },
	actorHandle: { type: "UTF8" },
	actorName: { type: "UTF8", optional: true },
	actorAvatarUrl: { type: "UTF8", optional: true },
	quotedActorUrl: { type: "UTF8", optional: true },
	quotedActorHandle: { type: "UTF8", optional: true },
	quotedActorName: { type: "UTF8", optional: true },
	quotedActorAvatarUrl: { type: "UTF8", optional: true },
	quotedPostUrl: { type: "UTF8", optional: true },
	quotedPostText: { type: "UTF8", optional: true },
	quotedPostDate: { type: "TIMESTAMP_MILLIS", optional: true },
	quotedPostType: { type: "UTF8", optional: true },
	quotedPostImages: {
		optional: true,
		repeated: true,
		fields: {
			url: { type: "UTF8" },
			alt: { type: "UTF8" },
		},
	},
	repostActorUrl: { type: "UTF8", optional: true },
	repostActorHandle: { type: "UTF8", optional: true },
	repostActorName: { type: "UTF8", optional: true },
	repostActorAvatarUrl: { type: "UTF8", optional: true },
	userId: { type: "UTF8" },
	listId: { type: "UTF8", optional: true },
});

export async function exportPartitionToParquet(
	partitionName: string,
): Promise<Buffer> {
	const chunks: Buffer[] = [];
	const writableStream: Pick<WriteStream, "write" | "end"> = {
		write(chunk: Buffer): boolean {
			chunks.push(chunk);
			return true;
		},
		end(): WriteStream {
			return this as WriteStream;
		},
	};

	const writer = await ParquetWriter.openStream(parquetSchema, writableStream);

	try {
		const result = await db
			.execute(sql.raw(`SELECT * FROM ${partitionName}`))
			.then((res) => res.rows as LinkPostRecord[]);

		for (const record of result) {
			await writer.appendRow(record);
		}

		await writer.close();
		return Buffer.concat(chunks);
	} catch (error) {
		await writer.close();
		throw new Error(`Failed to export partition ${partitionName}: ${error}`);
	}
}

export async function getPartitionRowCount(
	partitionName: string,
): Promise<number> {
	try {
		const result = await db.execute(
			sql.raw(`SELECT COUNT(*) FROM ${partitionName}`),
		);
		return Number(result.rows[0]?.[0] || 0);
	} catch (error) {
		return 0;
	}
}

export async function partitionExists(partitionName: string): Promise<boolean> {
	try {
		const result = await db.execute(
			sql.raw(`
			SELECT EXISTS (
				SELECT 1 FROM information_schema.tables 
				WHERE table_name = '${partitionName}' 
				AND table_schema = 'public'
			)
		`),
		);
		return Boolean(result.rows[0]?.[0]);
	} catch {
		return false;
	}
}
