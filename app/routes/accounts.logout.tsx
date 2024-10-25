import type { LoaderFunctionArgs } from "@vercel/remix";
import { logout } from "~/utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
	return logout({ request });
}
