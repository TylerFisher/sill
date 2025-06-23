import { CustomerPortal } from "@polar-sh/remix";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";

export const loader = CustomerPortal({
	getCustomerId: async (event) => {
		const userId = await requireUserId(event);

		const dbUser = await db.query.user.findFirst({
			where: and(eq(user.id, userId), isNotNull(user.customerId)),
		});

		if (!dbUser) throw new Error("Could not find user");

		// We already checked that it isn't null
		return dbUser.customerId as string;
	},
	server: "sandbox",
});
