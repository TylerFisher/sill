import { data } from "react-router";
import { requireUserFromContext } from "~/utils/context.server";
import { apiGetBlueskyLists } from "~/utils/api-client.server";
import type { Route } from "./+types/lists.bluesky";

export const loader = async ({ request, context }: Route.LoaderArgs) => {
	await requireUserFromContext(context);

	try {
		const result = await apiGetBlueskyLists(request);
		return data(result);
	} catch (error) {
		console.error("Failed to fetch Bluesky lists:", error);
		return data({ lists: [] });
	}
};
