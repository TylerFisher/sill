import { type ActionFunctionArgs, json } from "@vercel/remix";
import { parseWithZod } from "@conform-to/zod";
import { z } from "zod";
import { requireUserId } from "~/utils/auth.server";
import { db } from "~/drizzle/db.server";
import { mutePhrase } from "~/drizzle/schema.server";
import { and, eq } from "drizzle-orm";

const MuteDeleteSchema = z.object({
	phrase: z.string(),
});

export const action = async ({ request }: ActionFunctionArgs) => {
	const userId = await requireUserId(request);
	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		schema: MuteDeleteSchema,
		async: true,
	});

	if (submission.status !== "success") {
		return json(
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

	return json({});
};
