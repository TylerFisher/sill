import { type DuckDBConnection, DuckDBInstance } from "@duckdb/node-api";
import { getR2Client } from "./r2.js";

export interface DuckDBQueryResult<T = Record<string, unknown>> {
  rows: T[];
  columns: string[];
  count: number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface PartitionInfo {
  partition: string;
  date: Date;
  s3Url: string;
}

class DuckDBService {
  private instance: DuckDBInstance | null = null;
  private connection: DuckDBConnection | null = null;
  private r2Client = getR2Client();

  private async getConnection(): Promise<DuckDBConnection> {
    if (!this.connection) {
      this.instance = await DuckDBInstance.create();
      this.connection = await this.instance.connect();

      // Install and load required extensions
      await this.connection.run("INSTALL httpfs;");
      await this.connection.run("LOAD httpfs;");

      // Configure S3 settings for R2
      const endpoint = `${process.env.CLOUDFLARE_ACCOUNT_ID}.eu.r2.cloudflarestorage.com`;
      await this.connection.run(`
        CREATE OR REPLACE SECRET secret (
            TYPE r2,
            PROVIDER config,
            KEY_ID '${process.env.R2_ACCESS_KEY_ID}',
            SECRET '${process.env.R2_SECRET_ACCESS_KEY}',
            REGION 'auto',
            ENDPOINT '${endpoint}'
        );
			`);
    }
    return this.connection;
  }

  private generateR2Url(partitionName: string, date: Date): string {
    const r2Key = this.r2Client.generateArchiveKey(partitionName, date);
    return `s3://${process.env.R2_BUCKET_NAME}/${r2Key}`;
  }

  async executeCustomQuery(sql: string): Promise<DuckDBQueryResult> {
    const conn = await this.getConnection();
    const reader = await conn.runAndReadAll(sql);
    await reader.readAll();
    const rows = reader.getRowObjects();
    const columns = reader.columnNames();

    return {
      rows,
      columns,
      count: rows.length,
    };
  }

  async getAvailablePartitions(): Promise<PartitionInfo[]> {
    try {
      const r2Keys = await this.r2Client.listPartitionFiles();
      const partitions: PartitionInfo[] = [];

      for (const key of r2Keys) {
        // Extract partition name from key: partitions/year=2025/month=06/day=13/link_post_denormalized_temp_p20250613.parquet
        const partitionMatch = key.match(/\/([^\/]+)\.parquet$/);
        if (!partitionMatch) continue;

        const partitionName = partitionMatch[1];

        // Extract date from partition name: link_post_denormalized_temp_p20250613
        const dateMatch = partitionName.match(/(\d{4})_(\d{2})_(\d{2})$/);
        if (!dateMatch) continue;

        const [, year, month, day] = dateMatch;
        const date = new Date(
          Number.parseInt(year),
          Number.parseInt(month) - 1, // month is 0-indexed
          Number.parseInt(day)
        );

        partitions.push({
          partition: partitionName,
          date,
          s3Url: this.generateR2Url(partitionName, date),
        });
      }

      // Sort by date descending (newest first)
      partitions.sort((a, b) => b.date.getTime() - a.date.getTime());

      return partitions;
    } catch (error) {
      console.error("Failed to get available partitions from R2:", error);
      return [];
    }
  }

  async close(): Promise<void> {
    if (this.connection) {
      this.connection.disconnectSync();
      this.connection = null;
    }
  }
}

// Singleton instance
let duckdbService: DuckDBService | null = null;

export function getDuckDBService(): DuckDBService {
  if (!duckdbService) {
    duckdbService = new DuckDBService();
  }
  return duckdbService;
}

export { DuckDBService };
