import { redirect } from "react-router";
import type { Route } from "./+types/add";
import { requireUserId } from "~/utils/auth.server";
import { db } from "~/drizzle/db.server";
import { bookmark } from "~/drizzle/schema.server";
import { uuidv7 } from "uuidv7-js";
import { filterLinkOccurrences } from "~/utils/links.server";

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

	const posts = await filterLinkOccurrences({
		userId,
		url,
	});

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
