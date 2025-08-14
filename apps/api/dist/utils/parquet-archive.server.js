import { PassThrough, Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { ParquetSchema, ParquetTransformer } from "@dsnp/parquetjs";
import { sql } from "drizzle-orm";
import { db } from "@sill/schema";
const parquetSchema = new ParquetSchema({
    // LinkPostDenormalized fields
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
    // Link table fields
    linkId: { type: "UTF8", optional: true },
    linkTitle: { type: "UTF8", optional: true },
    linkDescription: { type: "UTF8", optional: true },
    linkImageUrl: { type: "UTF8", optional: true },
    linkGiftUrl: { type: "UTF8", optional: true },
    linkMetadata: { type: "UTF8", optional: true }, // JSON as string
    linkScraped: { type: "BOOLEAN", optional: true },
    linkPublishedDate: { type: "TIMESTAMP_MILLIS", optional: true },
    linkAuthors: {
        optional: true,
        repeated: true,
        type: "UTF8",
    },
    linkSiteName: { type: "UTF8", optional: true },
    linkTopics: {
        optional: true,
        repeated: true,
        type: "UTF8",
    },
});
/**
 * Stream-based parquet export using ParquetTransformer for better memory efficiency
 * Processes database records in streams instead of loading all data into memory
 */
export async function exportPartitionToParquet(partitionName) {
    const chunks = [];
    const outputStream = new PassThrough();
    // Collect output chunks
    outputStream.on("data", (chunk) => {
        chunks.push(chunk);
    });
    try {
        // Create readable stream from database query
        const dataStream = Readable.from(createDatabaseStream(partitionName));
        // Create parquet transformer
        const parquetTransformer = new ParquetTransformer(parquetSchema);
        // Use pipeline for proper error handling and cleanup
        await pipeline(dataStream, parquetTransformer, outputStream);
        return Buffer.concat(chunks);
    }
    catch (error) {
        throw new Error(`Failed to stream export partition ${partitionName}: ${error}`);
    }
}
/**
 * Creates an async generator for streaming database records with link data joined
 */
async function* createDatabaseStream(partitionName) {
    const batchSize = 1000; // Process records in batches
    let offset = 0;
    while (true) {
        const batch = await db
            .execute(sql.raw(`SELECT 
						lpd.*,
						l.id as "linkId",
						l.title as "linkTitle",
						l.description as "linkDescription",
						l."imageUrl" as "linkImageUrl",
						l."giftUrl" as "linkGiftUrl",
						l.metadata as "linkMetadata",
						l.scraped as "linkScraped",
						l."publishedDate" as "linkPublishedDate",
						l.authors as "linkAuthors",
						l."siteName" as "linkSiteName",
						l.topics as "linkTopics"
					FROM ${partitionName} lpd
					LEFT JOIN link l ON lpd."linkUrl" = l.url
					ORDER BY lpd.id 
					LIMIT ${batchSize} 
					OFFSET ${offset}`))
            .then((res) => res.rows);
        if (batch.length === 0) {
            break;
        }
        for (const record of batch) {
            // Transform the record for parquet format
            yield transformRecordForParquet(record);
        }
        offset += batchSize;
    }
}
/**
 * Transform database record for parquet format
 */
function transformRecordForParquet(record) {
    return {
        ...record,
        // Convert JSON fields to strings for parquet storage if they exist as objects
        linkMetadata: typeof record.linkMetadata === "object" && record.linkMetadata
            ? JSON.stringify(record.linkMetadata)
            : record.linkMetadata,
        // Ensure array fields are properly formatted
        linkAuthors: record.linkAuthors || [],
        linkTopics: record.linkTopics || [],
        postImages: record.postImages || [],
        quotedPostImages: record.quotedPostImages || [],
    };
}
export async function getPartitionRowCount(partitionName) {
    try {
        const result = await db.execute(sql.raw(`SELECT COUNT(*) FROM ${partitionName}`));
        return Number(result.rows[0]?.count || 0);
    }
    catch (error) {
        return 0;
    }
}
export async function partitionExists(partitionName) {
    try {
        const result = await db.execute(sql.raw(`
			SELECT EXISTS (
				SELECT 1 FROM information_schema.tables 
				WHERE table_name = '${partitionName}' 
				AND table_schema = 'public'
			)
		`));
        return Boolean(result.rows[0].exists);
    }
    catch {
        return false;
    }
}
