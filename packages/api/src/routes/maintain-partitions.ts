import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "@sill/schema";
import {
	type ArchiveResult,
	archivePartitionToR2,
	dropPartition,
	getPartitionNameForDate,
} from "../utils/partition-archive.server.js";

const app = new Hono();

app.get("/", async (c) => {
	const authHeader = c.req.header("Authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return c.text("Unauthorized", 401);
	}

	const token = authHeader.split(" ")[1];
	if (token !== process.env.CRON_API_KEY) {
		return c.text("Forbidden", 403);
	}

	const archiveDate = new Date();
	archiveDate.setDate(archiveDate.getDate() - 2);
	const partitionName = await getPartitionNameForDate(archiveDate);

	let archiveResult: ArchiveResult | null = null;
	let maintenanceSuccess = true;

	try {
		archiveResult = await archivePartitionToR2(partitionName, archiveDate);

		await db.execute(sql`
			SELECT create_partition_for_date(CURRENT_DATE);
			SELECT create_partition_for_date(CURRENT_DATE + INTERVAL '1 day');
		`);

		if (archiveResult.success) {
			await dropPartition(partitionName);
		} else {
			console.warn(
				`Archive failed for ${partitionName}, keeping partition:`,
				archiveResult.error,
			);
		}
	} catch (error) {
		maintenanceSuccess = false;
		console.error("Partition maintenance failed:", error);

		try {
			await db.execute(sql`SELECT maintain_partitions()`);
		} catch (fallbackError) {
			console.error("Fallback maintenance also failed:", fallbackError);
		}
	}

	return c.json({
		success: maintenanceSuccess,
		partition: partitionName,
		archiveDate: archiveDate.toISOString(),
		archive: archiveResult,
	});
});

export default app;