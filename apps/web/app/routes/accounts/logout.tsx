import { redirect } from "react-router";
import { apiLogout } from "~/utils/api-client.server";
import type { Route } from "./+types/logout";

export async function loader({ request }: Route.LoaderArgs) {
	try {
		const response = await apiLogout(request);

		// Forward the Set-Cookie headers from the API response to clear the session
		const headers = new Headers();
		const apiSetCookie = response.headers.get("set-cookie");
		if (apiSetCookie) {
			headers.append("set-cookie", apiSetCookie);
		}

		return redirect("/", { headers });
	} catch (error) {
		// If logout fails, still redirect to home
		console.error("Logout error:", error);
		return redirect("/");
	}
}
