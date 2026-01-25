import { data } from "react-router";
import { requireUserFromContext } from "~/utils/context.server";
import {
	apiCreateList,
	apiDeleteList,
	apiSyncList,
	apiStartSync,
	apiCompleteSync,
} from "~/utils/api-client.server";
import type { Route } from "./+types/list.subscribe";

export const action = async ({ request, context }: Route.ActionArgs) => {
	await requireUserFromContext(context);

	const formData = await request.formData();
	const uri = String(formData.get("uri"));
	const name = String(formData.get("name"));
	const accountId = String(formData.get("accountId"));
	const type = String(formData.get("type"));
	const checked = formData.get("subscribe") === "true";
	const syncId = formData.get("syncId")
		? String(formData.get("syncId"))
		: null;

	if (!uri) {
		return data({ error: "Missing URI" }, { status: 400 });
	}

	if (!["bluesky", "mastodon"].includes(type)) {
		return data({ error: "Invalid type" }, { status: 400 });
	}

	// Start server-side sync tracking if syncId provided
	if (syncId && checked) {
		try {
			await apiStartSync(request, { syncId, label: name });
		} catch (error) {
			console.error("Failed to start sync:", error);
			// Continue even if sync tracking fails
		}
	}

	try {
		if (checked) {
			// Create list subscription via API
			let createdList: { id: string; uri: string; name: string } | null = null;
			try {
				const createResult = await apiCreateList(request, {
					uri,
					name,
					accountId,
					type: type as "bluesky" | "mastodon",
				});
				createdList = createResult.list;
			} catch (error) {
				if (
					error instanceof Error &&
					error.message.includes("already subscribed")
				) {
					if (syncId) {
						await apiCompleteSync(request, {
							syncId,
							status: "error",
							error: "List already subscribed",
						}).catch(() => {});
					}
					return data({ error: "List already subscribed" }, { status: 409 });
				}
				throw error;
			}

			// Sync only this specific list (not all links from the service)
			if (createdList) {
				await apiSyncList(request, createdList.id);
			}

			// Complete sync successfully
			if (syncId) {
				try {
					await apiCompleteSync(request, { syncId, status: "success" });
				} catch (error) {
					console.error("Failed to complete sync:", error);
				}
			}
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

		return data({ success: true, syncId });
	} catch (error) {
		console.error("List subscribe action error:", error);
		// Complete sync with error
		if (syncId && checked) {
			await apiCompleteSync(request, {
				syncId,
				status: "error",
				error: error instanceof Error ? error.message : "Unknown error",
			}).catch(() => {});
		}
		return data({ error: "Something went wrong" }, { status: 500 });
	}
};
