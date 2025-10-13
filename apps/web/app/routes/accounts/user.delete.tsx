import { redirect } from "react-router";
import type { Route } from "./+types/user.delete";
import { requireUserFromContext } from "~/utils/context.server";
import { apiDeleteUser } from "~/utils/api-client.server";

export const action = async ({ context, request }: Route.ActionArgs) => {
	await requireUserFromContext(context);

	try {
		await apiDeleteUser(request);
		return redirect("/");
	} catch (error) {
		console.error("Delete user error:", error);
		throw new Response("Failed to delete user", { status: 500 });
	}
};
