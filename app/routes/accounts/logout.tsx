import { logout } from "~/utils/auth.server";
import type { Route } from "./+types/logout";

export async function loader({ request }: Route.LoaderArgs) {
	return logout({ request });
}
