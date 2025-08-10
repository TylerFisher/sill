import { data } from "react-router";
import { requireUserFromContext } from "~/utils/context.server";
import { apiCreateList, apiDeleteList, apiProcessLinks } from "~/utils/api-client.server";
import type { Route } from "./+types/list.subscribe";

export const action = async ({ request, context }: Route.ActionArgs) => {
	const existingUser = await requireUserFromContext(context);
	const userId = existingUser.id;

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

		if (!["bluesky", "mastodon"].includes(type)) {
			return data({ error: "Invalid type" }, { status: 400 });
		}

		if (checked) {
			// Create list subscription via API
			try {
				await apiCreateList(request, {
					uri,
					name,
					accountId,
					type: type as "bluesky" | "mastodon",
				});
			} catch (error) {
				if (
					error instanceof Error &&
					error.message.includes("already subscribed")
				) {
					return data({ error: "List already subscribed" }, { status: 409 });
				}
				throw error;
			}

			// Process links from the specific service
			await apiProcessLinks(request, type as "bluesky" | "mastodon");
		} else {
			// Delete list subscription via API
			try {
				await apiDeleteList(request, {
					uri,
					accountId,
				});
			} catch (error) {
				if (error instanceof Error && error.message.includes("not found")) {
					return data(
						{ error: "List subscription not found" },
						{ status: 404 },
					);
				}
				throw error;
			}
		}

		return data({ success: true });
	} catch (error) {
		console.error("List subscribe action error:", error);
		return data({ error: "Something went wrong" }, { status: 500 });
	}
};
