import { redirect } from "react-router";
import { requireUserId } from "~/utils/api.server";
import type { Route } from "./+types/index";

export async function loader({ request }: Route.LoaderArgs) {
	await requireUserId(request);
	return redirect("/settings/account");
}
