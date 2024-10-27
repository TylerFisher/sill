import { db } from "~/drizzle/db.server";
import { countLinkOccurrences } from "~/utils/links.server";

export const loader = async () => {
	const users = await db.query.user.findMany();
	const updatedData = await Promise.all(
		users.map(async (user) => {
			const linkCount = await countLinkOccurrences({
				userId: user.id,
				fetch: true,
			});
			return { ...user, linkCount };
		}),
	);

	return updatedData;
};
