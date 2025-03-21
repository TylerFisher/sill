import { redirect } from "react-router";
import type { Route } from "./+types/add";
import { requireUserId } from "~/utils/auth.server";
import { db } from "~/drizzle/db.server";
import { bookmark } from "~/drizzle/schema.server";
import { eq, and } from "drizzle-orm";

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

	await db
		.delete(bookmark)
		.where(and(eq(bookmark.userId, userId), eq(bookmark.linkUrl, url)));

	return { success: true };
};
