import { db } from "~/drizzle/db.server";
import { filterLinkOccurrences } from "~/utils/links.server";
import { getUserCacheKey } from "~/utils/redis.server";
import { connection } from "~/utils/redis.server";

export const loader = async () => {
	const users = await db.query.user.findMany();
	const updatedData = [];
	for (const user of users) {
		try {
			const linkCount = await filterLinkOccurrences({
				userId: user.id,
				fetch: true,
			});
			const redis = connection();
			redis.set(await getUserCacheKey(user.id), JSON.stringify(linkCount));
			updatedData.push(user.email);
		} catch (error) {
			console.error(`Failed to update user ${user.email}:`, error);
		}
	}

	return updatedData;
};
