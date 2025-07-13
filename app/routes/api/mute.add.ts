import { parseWithZod } from "@conform-to/zod";
import { eq } from "drizzle-orm";
import { data } from "react-router";
import { uuidv7 } from "uuidv7-js";
import { z } from "zod";
import { db } from "~/drizzle/db.server";
import { mutePhrase } from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";
import type { Route } from "./+types/mute.add";

const MutePhraseSchema = z.object({
	newPhrase: z.string().trim(),
});

export const action = async ({ request }: Route.ActionArgs) => {
	const userId = await requireUserId(request);
	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		schema: MutePhraseSchema.superRefine(async (data, ctx) => {
			const existingPhrases = await db.query.mutePhrase.findMany({
				where: eq(mutePhrase.userId, userId),
				columns: {
					phrase: true,
				},
			});
			const phrases = existingPhrases.map((p) => p.phrase.toLowerCase());
			if (phrases.includes(data.newPhrase.toLowerCase())) {
				ctx.addIssue({
					path: ["newPhrase"],
					code: z.ZodIssueCode.custom,
					message: "You've already added this phrase to your mute list",
				});
			}
		}),
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

	await db.insert(mutePhrase).values({
		id: uuidv7(),
		phrase: submission.value.newPhrase,
		userId,
	});

	return data({
		result: submission.reply(),
	});
};
