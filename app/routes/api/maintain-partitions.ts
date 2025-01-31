import type { Route } from "./+types/maintain-partitions";
import { sql } from "drizzle-orm";
import { db } from "~/drizzle/db.server";

export const loader = async ({ request }: Route.LoaderArgs) => {
	const authHeader = request.headers.get("Authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const token = authHeader.split(" ")[1];
	if (token !== process.env.CRON_API_KEY) {
		throw new Response("Forbidden", { status: 403 });
	}

	await db.execute(sql`SELECT maintain_partitions()`);

	return Response.json({});
};
