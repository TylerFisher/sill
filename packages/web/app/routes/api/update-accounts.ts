import { asc } from "drizzle-orm";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import { enqueueJob } from "~/utils/queue.server";
import type { Route } from "./+types/update-accounts";

export const loader = async ({ request }: Route.LoaderArgs) => {
	const authHeader = request.headers.get("Authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const token = authHeader.split(" ")[1];
	if (token !== process.env.CRON_API_KEY) {
		throw new Response("Forbidden", { status: 403 });
	}

	const users = await db.query.user.findMany({
		orderBy: asc(user.createdAt),
	});

	await Promise.all(users.map((user) => enqueueJob(user.id)));

	return Response.json({ queued: users.length });
};
