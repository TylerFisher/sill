import { and, eq } from "drizzle-orm";
import { redirect } from "react-router";
import { db } from "~/drizzle/db.server";
import { bookmark } from "~/drizzle/schema.server";
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

	await db
		.delete(bookmark)
		.where(and(eq(bookmark.userId, userId), eq(bookmark.linkUrl, url)));

	return { success: true };
};
