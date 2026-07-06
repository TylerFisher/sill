import { redirect } from "react-router";
import { apiDismissPlusPromo } from "~/utils/api-client.server";
import { requireUserFromContext } from "~/utils/context.server";
import { safeRedirect } from "~/utils/redirect";
import type { Route } from "./+types/dismiss-plus-promo";

export const action = async ({ request, context }: Route.ActionArgs) => {
  await requireUserFromContext(context);

  const formData = await request.formData();
  const redirectTo = formData.get("redirectTo");

  try {
    await apiDismissPlusPromo(request);
  } catch (error) {
    console.error("Dismiss plus promo error:", error);
  }

  if (typeof redirectTo === "string" && redirectTo) {
    return redirect(safeRedirect(redirectTo, "/links"));
  }
  return new Response("OK", { status: 200 });
};
