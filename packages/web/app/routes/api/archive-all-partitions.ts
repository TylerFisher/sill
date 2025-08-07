import { archiveAllPartitionsToR2 } from "~/utils/partition-archive.server";
import type { Route } from "./+types/archive-all-partitions";

export const loader = async ({ request }: Route.LoaderArgs) => {
	const authHeader = request.headers.get("Authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const token = authHeader.split(" ")[1];
	if (token !== process.env.CRON_API_KEY) {
		throw new Response("Forbidden", { status: 403 });
	}

	try {
		const results = await archiveAllPartitionsToR2();

		const summary = {
			totalPartitions: results.length,
			successCount: results.filter((r) => r.success).length,
			failureCount: results.filter((r) => !r.success).length,
			totalRows: results.reduce((sum, r) => sum + r.rowCount, 0),
			totalBytes: results.reduce((sum, r) => sum + (r.fileSizeBytes || 0), 0),
		};

		return Response.json({
			success: true,
			summary,
			results,
		});
	} catch (error) {
		console.error("Archive all partitions failed:", error);
		return Response.json(
			{
				success: false,
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
};
