import { apiGetClientMetadata } from "~/utils/api-client.server";
import type { Route } from "./+types/jwks";

export const headers: Route.HeadersFunction = () => ({
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=3600",
});

export const loader = async ({ request }: Route.LoaderArgs) => {
  const clientMetadata = await apiGetClientMetadata(request);
  // Extract JWKS from the client metadata response
  const jwks = clientMetadata.jwks;
  return Response.json(jwks);
};
