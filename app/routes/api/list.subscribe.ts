import type { Route } from "./+types/list.subscribe";
import { data } from "react-router";
import { uuidv7 } from "uuidv7-js";
import { db } from "~/drizzle/db.server";
import { list } from "~/drizzle/schema.server";
import { eq, and, or } from "drizzle-orm";

export const action = async ({ request }: Route.ActionArgs) => {
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
