import { db } from "~/drizzle/db.server";
import {
	fetchLinks,
	filterLinkOccurrences,
	insertNewLinks,
	type ProcessedResult,
} from "~/utils/links.server";
import { getUserCacheKey } from "~/utils/redis.server";
import { connection } from "~/utils/redis.server";

export const loader = async () => {
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

	await Promise.all(
		users.map(async (user) => {
			const linkCount = await filterLinkOccurrences({
				userId: user.id,
				fetch: true,
			});
			redis.set(await getUserCacheKey(user.id), JSON.stringify(linkCount));
			updatedData.push(user.email);
		}),
	);

	return updatedData;
};
