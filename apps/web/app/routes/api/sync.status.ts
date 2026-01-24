import { apiGetAllSyncs } from "~/utils/api-client.server";
import type { Route } from "./+types/sync.status";

export const loader = async ({ request }: Route.LoaderArgs) => {
	try {
		const syncs = await apiGetAllSyncs(request);
		return Response.json(syncs);
	} catch (error) {
		return Response.json([], { status: 200 });
	}
};
