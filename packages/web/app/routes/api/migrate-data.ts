import { sql } from "drizzle-orm";
import { db } from "~/drizzle/db.server";
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

	while (true) {
		const result = await db.execute(sql`SELECT migrate_data_batch()`);
		if (result.rows[0].migrate_data_batch === 0) break;
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}

	return Response.json({});
};
