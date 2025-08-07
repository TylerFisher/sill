import { and, eq, or } from "drizzle-orm";
import { data } from "react-router";
import { uuidv7 } from "uuidv7-js";
import { db } from "~/drizzle/db.server";
import { list } from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";
import { getLinksFromBluesky } from "~/utils/bluesky.server";
import { insertNewLinks } from "~/utils/links.server";
import { getLinksFromMastodon } from "~/utils/mastodon.server";
import type { Route } from "./+types/list.subscribe";

export const action = async ({ request }: Route.ActionArgs) => {
	const userId = await requireUserId(request);

	try {
		const formData = await request.formData();
		const uri = String(formData.get("uri"));
		const name = String(formData.get("name"));
		const accountId = String(formData.get("accountId"));
		const type = String(formData.get("type"));
		const checked = formData.get("subscribe") === "true";

		if (!uri) {
			return data({ error: "Missing URI" }, { status: 400 });
		}

		if (checked) {
			await db.insert(list).values({
				uri: uri,
				id: uuidv7(),
				name: name,
				blueskyAccountId: type === "bluesky" ? accountId : null,
				mastodonAccountId: type === "mastodon" ? accountId : null,
			});

			if (type === "bluesky") {
				const links = await getLinksFromBluesky(userId);
				await insertNewLinks(links);
			} else if (type === "mastodon") {
				const links = await getLinksFromMastodon(userId);
				await insertNewLinks(links);
			}
		} else {
			await db
				.delete(list)
				.where(
					and(
						eq(list.uri, uri),
						or(
							eq(list.blueskyAccountId, accountId),
							eq(list.mastodonAccountId, accountId),
						),
					),
				);
		}

		return data({ success: true });
	} catch (error) {
		console.error("Action error:", error);
		return data({ error: "Something went wrong" }, { status: 500 });
	}
};
