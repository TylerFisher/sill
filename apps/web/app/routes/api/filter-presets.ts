import type { FilterPresetConfig } from "@sill/schema";
import {
	apiCreateFilterPreset,
	apiDeleteFilterPreset,
	apiGetFilterPresets,
} from "~/utils/api-client.server";
import { requireUserFromContext } from "~/utils/context.server";
import type { Route } from "./+types/filter-presets";

/**
 * Create or delete a saved filter preset. Returns the refreshed list so the
 * FilterPresets component can update without revalidating the (streaming) feed
 * loader (see the /links route's shouldRevalidate).
 */
export const action = async ({ request, context }: Route.ActionArgs) => {
	await requireUserFromContext(context);

	const formData = await request.formData();
	const intent = formData.get("intent");

	try {
		if (intent === "create") {
			const name = String(formData.get("name") ?? "");
			let filters: FilterPresetConfig = {};
			try {
				filters = JSON.parse(String(formData.get("filters") ?? "{}"));
			} catch {
				filters = {};
			}
			await apiCreateFilterPreset(request, name, filters);
		} else if (intent === "delete") {
			const id = String(formData.get("id") ?? "");
			await apiDeleteFilterPreset(request, id);
		} else {
			return { error: "Unknown action" };
		}
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Something went wrong";
		return { error: message };
	}

	// Return the fresh list for the component to render.
	try {
		const { presets } = await apiGetFilterPresets(request);
		return { presets };
	} catch (error) {
		console.error("Reload filter presets error:", error);
		return { ok: true };
	}
};
