import { CustomerPortal } from "@polar-sh/remix";
import { apiGetUserProfile } from "~/utils/api-client.server";

export const loader = CustomerPortal({
	getCustomerId: async (event) => {
		// context isn't available, need to make separate api call
		const dbUser = await apiGetUserProfile(event);
		if (!dbUser) throw new Error("Could not find user");
		// We already checked that it isn't null
		return dbUser.customerId as string;
	},
	server: "sandbox",
});
