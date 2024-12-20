import type { Route } from "./+types/update-accounts";
import { db } from "~/drizzle/db.server";
import {
	fetchLinks,
	insertNewLinks,
	type ProcessedResult,
} from "~/utils/links.server";
import { asc } from "drizzle-orm";
import { user } from "~/drizzle/schema.server";

export const loader = async ({ request }: Route.LoaderArgs) => {
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
	// Determine which sixteenth of users to process based on current minute
	const sixteenthSize = Math.ceil(users.length / 16);
	// Calculate which 15-minute block we're in within a 4-hour period (0-15)
	const currentSixteenth = Math.floor(
		(currentMinute + (now.getHours() % 4) * 60) / 15,
	);
	const start = currentSixteenth * sixteenthSize;
	const end = Math.min(start + sixteenthSize, users.length);
	users = users.slice(start, end);

	const chunkSize = 10;
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
					try {
						const results = await fetchLinks(user.id);
						processedResults.push(...results);
					} catch (error) {
						console.error(
							"error fetching links second time for",
							user.email,
							error,
						);
					}
				}
			}),
		);

		try {
			await insertNewLinks(processedResults);
		} catch (error) {
			console.error("error sending links to database", error);
			try {
				await insertNewLinks(processedResults);
			} catch (error) {
				console.error("error sending links to database second time", error);
			}
		}
	}

	return Response.json({});
};
