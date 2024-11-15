import type { LoaderFunctionArgs } from "@remix-run/node";
import { db } from "~/drizzle/db.server";
import {
	fetchLinks,
	filterLinkOccurrences,
	insertNewLinks,
	type ProcessedResult,
} from "~/utils/links.server";
import { getUserCacheKey } from "~/utils/redis.server";
import { connection } from "~/utils/redis.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const authHeader = request.headers.get("Authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const token = authHeader.split(" ")[1];
	if (token !== process.env.CRON_API_KEY) {
		throw new Response("Forbidden", { status: 403 });
	}

	const users = await db.query.user.findMany();
	const redis = connection();
	const processedResults: ProcessedResult[] = [];
	await Promise.all(
		users.map(async (user) => {
			const results = await fetchLinks(user.id);
			processedResults.push(...results);
		}),
	);
	await insertNewLinks(processedResults);

	const updatedData: string[] = [];

	for (const user of users) {
		const linkCount = await filterLinkOccurrences({
			userId: user.id,
		});
		await redis.set(await getUserCacheKey(user.id), JSON.stringify(linkCount));
		updatedData.push(user.email);
	}

	return updatedData;
};
