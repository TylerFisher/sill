import { redirect } from "react-router";
import type { Route } from "./+types/index";
import { requireUserFromContext } from "~/utils/context.server";

export async function loader({ context }: Route.LoaderArgs) {
	await requireUserFromContext(context);
	return redirect("/settings/account");
}
