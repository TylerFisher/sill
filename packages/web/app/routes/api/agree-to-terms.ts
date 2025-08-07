import { and, desc, eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7-js";
import { db } from "~/drizzle/db.server";
import { termsAgreement, termsUpdate, user } from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";
import type { Route } from "./+types/agree-to-terms";

export const action = async ({ request }: Route.ActionArgs) => {
	const userId = await requireUserId(request);

	const latestTerms = await db.query.termsUpdate.findFirst({
		orderBy: desc(termsUpdate.termsDate),
	});

	if (!latestTerms) {
		return new Response("No terms found", { status: 400 });
	}

	const agreed = await db.query.termsAgreement.findFirst({
		where: and(eq(termsUpdate.id, latestTerms.id), eq(user.id, userId)),
	});

	if (agreed) {
		return new Response("Already agreed", { status: 200 });
	}

	await db.insert(termsAgreement).values({
		id: uuidv7(),
		userId,
		termsUpdateId: latestTerms.id,
	});

	return new Response("Agreed", { status: 200 });
};
