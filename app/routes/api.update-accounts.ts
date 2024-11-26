import type { LoaderFunctionArgs } from "@remix-run/node";
import { db } from "~/drizzle/db.server";
import {
	fetchLinks,
	filterLinkOccurrences,
	insertNewLinks,
	type MostRecentLinkPosts,
	type ProcessedResult,
} from "~/utils/links.server";
import { getUserCacheKey } from "~/utils/redis.server";
import { connection } from "~/utils/redis.server";
import { asc } from "drizzle-orm";
import { user } from "~/drizzle/schema.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const authHeader = request.headers.get("Authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const token = authHeader.split(" ")[1];
	if (token !== process.env.CRON_API_KEY) {
		throw new Response("Forbidden", { status: 403 });
	}

	const now = new Date();
	const currentMinute = now.getMinutes();

	let users = await db.query.user.findMany({
		orderBy: asc(user.createdAt),
		with: {
			mastodonAccounts: {
				with: {
					mastodonInstance: true,
				},
			},
		},
	});
	// Determine which quarter of users to process based on current minute
	const quarterSize = Math.ceil(users.length / 4);
	const currentQuarter = Math.floor(currentMinute / 15);
	const start = currentQuarter * quarterSize;
	const end = Math.min(start + quarterSize, users.length);
	users = users.slice(start, end);

	for (let i = 0; i < users.length; i += 1) {
		const user = users[i];
		try {
			const results = await fetchLinks(user.id);
			await insertNewLinks(results);
		} catch (error) {
			console.error(
				"error fetching links for",
				user.mastodonAccounts[0].mastodonInstance.instance,
				error,
			);
		}
	}

	// const updatedData: string[] = [];
	// for (const user of users) {
	// 	let linkCount: MostRecentLinkPosts[];
	// 	try {
	// 		linkCount = await filterLinkOccurrences({
	// 			userId: user.id,
	// 		});
	// 	} catch (error) {
	// 		console.error("error filtering links for", user.email, error);
	// 		throw error;
	// 	}
	// 	redis.set(await getUserCacheKey(user.id), JSON.stringify(linkCount));

	// accountUpdateQueue.add("update-accounts", {
	// 	userId: user.id,
	// });
	// }

	return Response.json({});
};
