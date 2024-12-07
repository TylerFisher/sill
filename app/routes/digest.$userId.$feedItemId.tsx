import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { eq } from "drizzle-orm";
import { db } from "~/drizzle/db.server";
import { digestRssFeedItem } from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const userId = await requireUserId(request);

	if (!userId) {
		return redirect("/accounts/login");
	}

	const feedItemId = params.feedItemId;

	if (!feedItemId) {
		throw new Error("Feed item ID is required");
	}

	const feedItem = await db.query.digestRssFeedItem.findFirst({
		where: eq(digestRssFeedItem.id, feedItemId),
	});

	if (!feedItem) {
		throw new Error("Feed item not found");
	}

	return new Response(feedItem.html, {
		headers: {
			"Content-Type": "text/html",
		},
	});
};
