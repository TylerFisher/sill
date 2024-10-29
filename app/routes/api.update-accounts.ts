import { db } from "~/drizzle/db.server";
import { filterLinkOccurrences } from "~/utils/links.server";
import { getUserCacheKey } from "~/utils/redis.server";
import { Redis } from "@upstash/redis";

export const loader = async () => {
	const users = await db.query.user.findMany();
	const updatedData = await Promise.all(
		users.map(async (user) => {
			const linkCount = await filterLinkOccurrences({
				userId: user.id,
				fetch: true,
			});
			const redis = Redis.fromEnv();
			redis.set(await getUserCacheKey(user.id), JSON.stringify(linkCount));
			return { ...user, linkCount };
		}),
	);

	return updatedData;
};
