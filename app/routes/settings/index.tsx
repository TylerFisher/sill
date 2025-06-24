import type { Route } from "./+types/index";
import { redirect } from "react-router";
import { requireUserId } from "~/utils/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
	await requireUserId(request);
	return redirect("/settings/account");
}
