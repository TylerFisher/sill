import type { FilterPresetConfig } from "@sill/schema";
import {
	apiCreateFilterPreset,
	apiDeleteFilterPreset,
	apiGetFilterPresets,
	apiUpdateFilterPreset,
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
		} else if (intent === "update") {
			const id = String(formData.get("id") ?? "");
			const nameRaw = formData.get("name");
			const filtersRaw = formData.get("filters");
			const updates: { name?: string; filters?: FilterPresetConfig } = {};
			if (nameRaw !== null) updates.name = String(nameRaw);
			if (filtersRaw !== null) {
				try {
					updates.filters = JSON.parse(String(filtersRaw));
				} catch {
					updates.filters = {};
				}
			}
			await apiUpdateFilterPreset(request, id, updates);
		} else {
			return { error: "Unknown action" };
		}
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Something went wrong";
		// Tag the failure with its intent. The create dialog and the delete
		// confirm share one fetcher, so each must ignore the other's errors.
		return { error: message, intent: typeof intent === "string" ? intent : "" };
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
