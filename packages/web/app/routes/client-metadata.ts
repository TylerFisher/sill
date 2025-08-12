import { apiGetClientMetadata } from "~/utils/api-client.server";
import type { Route } from "./+types/client-metadata";

export const headers: Route.HeadersFunction = () => ({
	"Content-Type": "application/json",
	"Cache-Control": "public, max-age=3600",
});

export const loader = async ({ request }: Route.LoaderArgs) => {
	const clientMetadata = await apiGetClientMetadata(request);
	return Response.json(clientMetadata);
};
