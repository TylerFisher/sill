import { redirect } from "react-router";
import type { Route } from "./+types/add";
import { requireUserId } from "~/utils/auth.server";
import { db } from "~/drizzle/db.server";
import { bookmark, link, digestItem } from "~/drizzle/schema.server";
import { uuidv7 } from "uuidv7-js";
import {
	filterLinkOccurrences,
	type MostRecentLinkPosts,
} from "~/utils/links.server";
import { eq, and, sql } from "drizzle-orm";

export const action = async ({ request }: Route.ActionArgs) => {
	const userId = await requireUserId(request);

	if (!userId) {
		return redirect("/login");
	}

	const formData = await request.formData();
	const url = String(formData.get("url"));

	if (!url) {
		return redirect("/bookmarks");
	}

	const posts: MostRecentLinkPosts[] = await filterLinkOccurrences({
		userId,
		url,
	});

	// Bookmarking from an old digest
	if (posts.length === 0) {
		const linkData = await db.query.link.findFirst({
			where: eq(link.url, url),
		});

		const digestEdition = await db.query.digestItem.findFirst({
			where: and(
				eq(digestItem.userId, userId),
				// Using SQL expression to search within the JSON array
				// Each item in the json array has a "link" property with a "url" field
				sql`EXISTS (
					SELECT 1 FROM json_array_elements(${digestItem.json}::json) as items
					WHERE items->'link'->>'url' = ${url}
				)`,
			),
		});

		// Extract the specific element from the JSON array that matches the URL
		let matchingPost: MostRecentLinkPosts | null | undefined = null;
		if (digestEdition?.json) {
			matchingPost = digestEdition.json.find((item) => item.link?.url === url);
		}

		if (matchingPost) {
			posts.push(matchingPost);
		}
	}

	await db
		.insert(bookmark)
		.values({
			id: uuidv7(),
			userId,
			linkUrl: url,
			posts: posts[0],
		})
		.returning();

	return { success: true };
};
