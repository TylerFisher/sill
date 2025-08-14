import { sql } from "drizzle-orm";
import { db } from "@sill/schema";
import { getR2Client } from "@sill/links";
import {
  exportPartitionToParquet,
  getPartitionRowCount,
  partitionExists,
} from "./parquet-archive.server.js";

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
  date: Date
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
    console.log(parquetBuffer);
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
      result.error
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

export async function getAllLinkPostPartitions(): Promise<string[]> {
  try {
    const result = await db.execute(
      sql.raw(`
			SELECT table_name 
			FROM information_schema.tables 
			WHERE table_schema = 'public' 
			AND table_name LIKE 'link_post_denormalized_%'
			AND table_name ~ '^link_post_denormalized_[0-9]{4}_[0-9]{2}_[0-9]{2}$'
			ORDER BY table_name
		`)
    );

    return result.rows.map((row) => row.table_name as string);
  } catch (error) {
    console.error("Failed to get partition list:", error);
    return [];
  }
}

export async function archiveAllPartitionsToR2(): Promise<ArchiveResult[]> {
  const partitions = await getAllLinkPostPartitions();
  const results: ArchiveResult[] = [];

  console.log(`Found ${partitions.length} partitions to archive:`, partitions);

  for (const partitionName of partitions) {
    console.log(`Processing partition: ${partitionName}`);

    const dateMatch = partitionName.match(/(\d{4})_(\d{2})_(\d{2})$/);
    if (!dateMatch) {
      results.push({
        success: false,
        partitionName,
        rowCount: 0,
        error: "Could not parse date from partition name",
      });
      continue;
    }

    const [, year, month, day] = dateMatch;
    const partitionDate = new Date(`${year}-${month}-${day}`);

    const result = await archivePartitionToR2(partitionName, partitionDate);
    results.push(result);

    if (result.success) {
      console.log(
        `✓ Successfully archived ${partitionName} (${result.rowCount} rows, ${result.fileSizeBytes} bytes)`
      );
    } else {
      console.error(`✗ Failed to archive ${partitionName}: ${result.error}`);
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const totalRows = results.reduce((sum, r) => sum + r.rowCount, 0);
  const totalBytes = results.reduce(
    (sum, r) => sum + (r.fileSizeBytes || 0),
    0
  );

  console.log(
    `Archive summary: ${successCount}/${results.length} partitions archived successfully`
  );
  console.log(`Total rows archived: ${totalRows}`);
  console.log(
    `Total data archived: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`
  );

  return results;
}
