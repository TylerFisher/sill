import { sql } from "drizzle-orm";
import { db } from "~/drizzle/db.server";
import {
	type ArchiveResult,
	archivePartitionToR2,
	dropPartition,
	getPartitionNameForDate,
} from "~/utils/partition-archive.server";
import type { Route } from "./+types/maintain-partitions";

export const loader = async ({ request }: Route.LoaderArgs) => {
	const authHeader = request.headers.get("Authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const token = authHeader.split(" ")[1];
	if (token !== process.env.CRON_API_KEY) {
		throw new Response("Forbidden", { status: 403 });
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

	return Response.json({
		success: maintenanceSuccess,
		partition: partitionName,
		archiveDate: archiveDate.toISOString(),
		archive: archiveResult,
	});
};
