import { sql } from "drizzle-orm";
import { db } from "~/drizzle/db.server";
import {
	exportPartitionToParquet,
	getPartitionRowCount,
	partitionExists,
} from "./parquet-archive.server";
import { getR2Client } from "./r2.server";

export interface ArchiveResult {
	success: boolean;
	partitionName: string;
	rowCount: number;
	fileSizeBytes?: number;
	r2Key?: string;
	error?: string;
}

export async function archivePartitionToR2(
	partitionName: string,
	date: Date,
): Promise<ArchiveResult> {
	const result: ArchiveResult = {
		success: false,
		partitionName,
		rowCount: 0,
	};

	try {
		// Check if partition exists
		if (!(await partitionExists(partitionName))) {
			result.error = "Partition does not exist";
			return result;
		}

		// Get row count for logging
		result.rowCount = await getPartitionRowCount(partitionName);

		// Skip if empty partition
		if (result.rowCount === 0) {
			result.success = true;
			result.error = "Partition is empty, skipping archive";
			return result;
		}

		// Export partition to Parquet buffer
		const parquetBuffer = await exportPartitionToParquet(partitionName);
		result.fileSizeBytes = parquetBuffer.length;

		// Upload to R2
		const r2Client = getR2Client();
		const r2Key = r2Client.generateArchiveKey(partitionName, date);

		await r2Client.uploadFile(r2Key, parquetBuffer, {
			partition_name: partitionName,
			row_count: result.rowCount.toString(),
			archive_date: date.toISOString(),
			file_size_bytes: result.fileSizeBytes.toString(),
		});

		// Verify upload
		const uploadVerified = await r2Client.verifyUpload(r2Key);
		if (!uploadVerified) {
			throw new Error("Upload verification failed");
		}

		result.success = true;
		result.r2Key = r2Key;

		console.log(`Successfully archived partition ${partitionName}:`, {
			rowCount: result.rowCount,
			fileSizeBytes: result.fileSizeBytes,
			r2Key,
		});

		return result;
	} catch (error) {
		result.error = error instanceof Error ? error.message : String(error);
		console.error(
			`Failed to archive partition ${partitionName}:`,
			result.error,
		);
		return result;
	}
}

export async function getPartitionNameForDate(date: Date): Promise<string> {
	const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
	return `link_post_denormalized_temp_p${dateStr}`;
}

export async function dropPartition(partitionName: string): Promise<void> {
	await db.execute(sql.raw(`DROP TABLE IF EXISTS ${partitionName}`));
}
