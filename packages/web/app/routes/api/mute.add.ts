import { parseWithZod } from "@conform-to/zod";
import { data } from "react-router";
import { z } from "zod";
import { requireUserFromContext } from "~/utils/context.server";
import { apiAddMutePhrase, apiGetMutePhrases } from "~/utils/api-client.server";
import type { Route } from "./+types/mute.add";

const MutePhraseSchema = z.object({
	newPhrase: z.string().trim(),
});

export const action = async ({ request, context }: Route.ActionArgs) => {
	await requireUserFromContext(context);
	
	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		schema: MutePhraseSchema.superRefine(async (data, ctx) => {
			try {
				const { phrases } = await apiGetMutePhrases(request);
				const existingPhrases = phrases.map((p) => p.phrase.toLowerCase());
				if (existingPhrases.includes(data.newPhrase.toLowerCase())) {
					ctx.addIssue({
						path: ["newPhrase"],
						code: z.ZodIssueCode.custom,
						message: "You've already added this phrase to your mute list",
					});
				}
			} catch (error) {
				console.error("Error checking existing mute phrases:", error);
				ctx.addIssue({
					path: ["newPhrase"],
					code: z.ZodIssueCode.custom,
					message: "Unable to verify phrase. Please try again.",
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

	try {
		await apiAddMutePhrase(request, submission.value.newPhrase);
		
		return data({
			result: submission.reply(),
		});
	} catch (error) {
		console.error("Add mute phrase error:", error);
		
		// Handle other errors
		return data(
			{
				result: submission.reply({
					formErrors: ["Failed to add mute phrase. Please try again."],
				}),
			},
			{ status: 500 },
		);
	}
};
