import type { Route } from "./+types/logout";
import { logout } from "~/utils/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
	return logout({ request });
}
