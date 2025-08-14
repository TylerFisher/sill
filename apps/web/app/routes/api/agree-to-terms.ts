import { requireUserFromContext } from "~/utils/context.server";
import { apiGetLatestTermsUpdate, apiGetTermsAgreement, apiInsertTermsAgreement } from "~/utils/api-client.server";
import type { Route } from "./+types/agree-to-terms";

export const action = async ({ request, context }: Route.ActionArgs) => {
	await requireUserFromContext(context);

	try {
		// Get latest terms update
		const latestTerms = await apiGetLatestTermsUpdate(request);

		// Check if user has already agreed to these terms
		const { agreement } = await apiGetTermsAgreement(request, latestTerms.id);

		if (agreement) {
			return new Response("Already agreed", { status: 200 });
		}

		// Insert new terms agreement
		await apiInsertTermsAgreement(request, latestTerms.id);

		return new Response("Agreed", { status: 200 });
	} catch (error) {
		console.error("Terms agreement error:", error);
		
		if (error instanceof Error && error.message.includes("No terms found")) {
			return new Response("No terms found", { status: 400 });
		}
		
		return new Response("Internal server error", { status: 500 });
	}
};
