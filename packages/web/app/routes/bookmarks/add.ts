import { and, eq, sql } from "drizzle-orm";
import { redirect } from "react-router";
import { uuidv7 } from "uuidv7-js";
import { db } from "~/drizzle/db.server";
import { bookmark, digestItem } from "~/drizzle/schema.server";
import {
	type MostRecentLinkPosts,
	filterLinkOccurrences,
} from "~/utils/links.server";
import type { Route } from "./+types/add";
import { requireUserFromContext } from "~/utils/context.server";

export const action = async ({ request, context }: Route.ActionArgs) => {
	const { id: userId } = await requireUserFromContext(context);

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
