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
	const chunkSize = 100;
	for (let i = 0; i < users.length; i += chunkSize) {
		const userChunk = users.slice(i, i + chunkSize);
		const processedResults: ProcessedResult[] = [];

		await Promise.all(
			userChunk.map(async (user) => {
				try {
					const results = await fetchLinks(user.id);
					processedResults.push(...results);
				} catch (error) {
					console.error("error fetching links for", user.email, error);
				}
			}),
		);

		await insertNewLinks(processedResults);
	}

	const updatedData: string[] = [];

	for (const user of users) {
		try {
			const linkCount = await filterLinkOccurrences({
				userId: user.id,
			});
			await redis.set(
				await getUserCacheKey(user.id),
				JSON.stringify(linkCount),
			);
			updatedData.push(user.email);
		} catch (error) {
			console.error("error updating redis cache for", user.email, error);
		}
	}

	return updatedData;
};
