import { requireUserId } from "~/utils/auth.server";
import type { Route } from "./+types/index";
import { eq } from "drizzle-orm";
import { redirect } from "react-router";
import { user, digestSettings } from "~/drizzle/schema.server";
import { db } from "~/drizzle/db.server";

export const loader = async ({ request }: Route.LoaderArgs) => {
	const userId = await requireUserId(request);

	if (!userId) {
		throw new Response(null, {
			status: 401,
			statusText: "Unauthorized",
		});
	}

	const existingUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
	});

	if (!existingUser) {
		throw new Response(null, {
			status: 404,
			statusText: "Not Found",
		});
	}

	const settings = await db.query.digestSettings.findFirst({
		where: eq(digestSettings.userId, userId),
	});

	if (settings) {
		return redirect("/digest/archive");
	}

	return redirect("/digest/settings");
};
