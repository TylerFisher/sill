import type { Route } from "./+types/mute.delete";
import { parseWithZod } from "@conform-to/zod";
import { data } from "react-router";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/drizzle/db.server";
import { mutePhrase } from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";

const MuteDeleteSchema = z.object({
	phrase: z.string(),
});

export const action = async ({ request }: Route.ActionArgs) => {
	const userId = await requireUserId(request);
	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		schema: MuteDeleteSchema,
		async: true,
	});

	if (submission.status !== "success") {
		return data(
			{
				result: submission.reply(),
			},
			{
				status: submission.status === "error" ? 400 : 200,
			},
		);
	}

	await db
		.delete(mutePhrase)
		.where(
			and(
				eq(mutePhrase.userId, userId),
				eq(mutePhrase.phrase, submission.value.phrase),
			),
		);

	return {};
};
