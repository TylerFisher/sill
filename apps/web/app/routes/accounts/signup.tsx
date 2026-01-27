import { redirect } from "react-router";
import type { Route } from "./+types/signup";

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const redirectTo = url.searchParams.get("redirectTo");
	const targetUrl = redirectTo
		? `/accounts/login?redirectTo=${encodeURIComponent(redirectTo)}`
		: "/accounts/login";
	return redirect(targetUrl);
}
