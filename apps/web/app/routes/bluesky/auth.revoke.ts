import { redirect } from "react-router";
import type { Route } from "./+types/auth.revoke";
import { requireUserFromContext } from "~/utils/context.server";
import { apiBlueskyAuthRevoke } from "~/utils/api-client.server";

export const action = async ({ request, context }: Route.ActionArgs) => {
  const { id: userId } = await requireUserFromContext(context);

  if (!userId) {
    throw new Error("User not authenticated.");
  }

  await apiBlueskyAuthRevoke(request);

  return redirect("/settings/connections");
};
