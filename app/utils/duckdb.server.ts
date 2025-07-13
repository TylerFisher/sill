import { type DuckDBConnection, DuckDBInstance } from "@duckdb/node-api";
import type { linkPostDenormalized, postType } from "~/drizzle/schema.server";
import { getR2Client } from "./r2.server";

type LinkPostRecord = typeof linkPostDenormalized.$inferSelect;
type PostType = (typeof postType.enumValues)[number];

export interface DuckDBQueryResult<T = Record<string, unknown>> {
	rows: T[];
	columns: string[];
	count: number;
}

export interface DateRange {
	startDate: Date;
	endDate: Date;
}

export interface LinkPostQuery {
	dateRange?: DateRange;
	linkUrl?: string;
	actorHandle?: string;
	postType?: PostType;
	search?: string;
	limit?: number;
	offset?: number;
}

export interface TopLink {
	linkUrl: string;
	shareCount: number;
	uniqueSharers: number;
	firstShared: Date;
	lastShared: Date;
	sharers: string[];
}

export interface TopActor {
	actorHandle: string;
	actorName?: string;
	actorUrl: string;
	postCount: number;
	uniqueLinksShared: number;
	firstPost: Date;
	lastPost: Date;
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
				SET s3_region='auto';
				SET s3_endpoint='${endpoint}';
				SET s3_access_key_id='${process.env.R2_ACCESS_KEY_ID}';
				SET s3_secret_access_key='${process.env.R2_SECRET_ACCESS_KEY}';
				SET s3_use_ssl=true;
			`);
		}
		return this.connection;
	}

	private generateR2Url(partitionName: string, date: Date): string {
		const r2Key = this.r2Client.generateArchiveKey(partitionName, date);
		return `s3://${process.env.R2_BUCKET_NAME}/${r2Key}`;
	}

	async queryLinkPosts(
		query: LinkPostQuery = {},
	): Promise<DuckDBQueryResult<LinkPostRecord>> {
		const conn = await this.getConnection();

		// Default to last 30 days if no date range provided
		const endDate = query.dateRange?.endDate || new Date();
		const startDate =
			query.dateRange?.startDate ||
			new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

		// Get available partitions from R2 and filter by date range
		const availablePartitions = await this.getAvailablePartitions();
		const filteredPartitions = availablePartitions.filter(
			(partition) => partition.date >= startDate && partition.date <= endDate,
		);

		// Return empty result if no partitions are available
		if (filteredPartitions.length === 0) {
			return {
				rows: [],
				columns: [],
				count: 0,
			};
		}

		// Build UNION ALL query for multiple parquet files
		const unionQueries = filteredPartitions.map((partition) => {
			return `SELECT * FROM read_parquet('${partition.s3Url}')`;
		});

		let sql = `WITH all_posts AS (${unionQueries.join(" UNION ALL ")}) SELECT * FROM all_posts`;

		const conditions: string[] = [];

		// Add WHERE conditions
		if (query.linkUrl) {
			conditions.push(`linkUrl LIKE '%${query.linkUrl}%'`);
		}

		if (query.actorHandle) {
			conditions.push(`actorHandle LIKE '%${query.actorHandle}%'`);
		}

		if (query.postType) {
			conditions.push(`postType = '${query.postType}'`);
		}

		if (query.search) {
			conditions.push(
				`(postText LIKE '%${query.search}%' OR actorName LIKE '%${query.search}%')`,
			);
		}

		if (conditions.length > 0) {
			sql += ` WHERE ${conditions.join(" AND ")}`;
		}

		// Add ordering and limits
		sql += " ORDER BY postDate DESC";

		if (query.limit) {
			sql += ` LIMIT ${query.limit}`;
		}

		if (query.offset) {
			sql += ` OFFSET ${query.offset}`;
		}

		const reader = await conn.runAndReadAll(sql);
		await reader.readAll();
		const rows = reader
			.getRowObjects()
			.map((row: unknown) => row as LinkPostRecord);
		const columns = reader.columnNames();

		return {
			rows,
			columns,
			count: rows.length,
		};
	}

	async getTopLinks(
		dateRange: DateRange,
		limit = 50,
	): Promise<DuckDBQueryResult<TopLink>> {
		const conn = await this.getConnection();

		// Get available partitions from R2 and filter by date range
		const availablePartitions = await this.getAvailablePartitions();
		const filteredPartitions = availablePartitions.filter(
			(partition) =>
				partition.date >= dateRange.startDate &&
				partition.date <= dateRange.endDate,
		);

		// Return empty result if no partitions are available
		if (filteredPartitions.length === 0) {
			return {
				rows: [],
				columns: [],
				count: 0,
			};
		}

		const unionQueries = filteredPartitions.map((partition) => {
			return `SELECT * FROM read_parquet('${partition.s3Url}')`;
		});

		const sql = `
			WITH all_posts AS (${unionQueries.join(" UNION ALL ")})
			SELECT 
				linkUrl,
				COUNT(*) as shareCount,
				COUNT(DISTINCT actorHandle) as uniqueSharers,
				MIN(postDate) as firstShared,
				MAX(postDate) as lastShared,
				ARRAY_AGG(DISTINCT actorHandle ORDER BY actorHandle) as sharers
			FROM all_posts 
			WHERE linkUrl IS NOT NULL 
			GROUP BY linkUrl 
			ORDER BY shareCount DESC, uniqueSharers DESC 
			LIMIT ${limit}
		`;

		const reader = await conn.runAndReadAll(sql);
		await reader.readAll();
		const rows = reader.getRowObjects().map((row: unknown) => row as TopLink);
		const columns = reader.columnNames();

		return {
			rows,
			columns,
			count: rows.length,
		};
	}

	async getTopActors(
		dateRange: DateRange,
		limit = 50,
	): Promise<DuckDBQueryResult<TopActor>> {
		const conn = await this.getConnection();

		// Get available partitions from R2 and filter by date range
		const availablePartitions = await this.getAvailablePartitions();
		const filteredPartitions = availablePartitions.filter(
			(partition) =>
				partition.date >= dateRange.startDate &&
				partition.date <= dateRange.endDate,
		);

		// Return empty result if no partitions are available
		if (filteredPartitions.length === 0) {
			return {
				rows: [],
				columns: [],
				count: 0,
			};
		}

		const unionQueries = filteredPartitions.map((partition) => {
			return `SELECT * FROM read_parquet('${partition.s3Url}')`;
		});

		const sql = `
			WITH all_posts AS (${unionQueries.join(" UNION ALL ")})
			SELECT 
				actorHandle,
				actorName,
				actorUrl,
				COUNT(*) as postCount,
				COUNT(DISTINCT linkUrl) as uniqueLinksShared,
				MIN(postDate) as firstPost,
				MAX(postDate) as lastPost
			FROM all_posts 
			GROUP BY actorHandle, actorName, actorUrl 
			ORDER BY postCount DESC, uniqueLinksShared DESC 
			LIMIT ${limit}
		`;

		const reader = await conn.runAndReadAll(sql);
		await reader.readAll();
		const rows = reader.getRowObjects().map((row: unknown) => row as TopActor);
		const columns = reader.columnNames();

		return {
			rows,
			columns,
			count: rows.length,
		};
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
					Number.parseInt(day),
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
