import { data } from "react-router";
import { requireUserFromContext } from "~/utils/context.server";
import { apiGetMastodonLists } from "~/utils/api-client.server";
import type { Route } from "./+types/lists.mastodon";

export const loader = async ({ request, context }: Route.LoaderArgs) => {
	await requireUserFromContext(context);

	try {
		const result = await apiGetMastodonLists(request);
		return data(result);
	} catch (error) {
		console.error("Failed to fetch Mastodon lists:", error);
		return data({ lists: [] });
	}
};
