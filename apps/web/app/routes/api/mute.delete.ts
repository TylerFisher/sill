import { parseWithZod } from "@conform-to/zod";
import { data } from "react-router";
import { z } from "zod";
import { requireUserFromContext } from "~/utils/context.server";
import { apiDeleteMutePhrase } from "~/utils/api-client.server";
import type { Route } from "./+types/mute.delete";

const MuteDeleteSchema = z.object({
	phrase: z.string(),
});

export const action = async ({ request, context }: Route.ActionArgs) => {
	await requireUserFromContext(context);
	
	const formData = await request.formData();
	const submission = parseWithZod(formData, {
		schema: MuteDeleteSchema,
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
		await apiDeleteMutePhrase(request, submission.value.phrase);
		return {};
	} catch (error) {
		console.error("Delete mute phrase error:", error);

		// Handle phrase not found error
		if (error instanceof Error && error.message.includes("Mute phrase not found")) {
			return data(
				{
					result: submission.reply({
						fieldErrors: {
							phrase: ["Mute phrase not found"],
						},
					}),
				},
				{ status: 404 },
			);
		}

		// Handle other errors
		return data(
			{
				result: submission.reply({
					formErrors: ["Failed to delete mute phrase. Please try again."],
				}),
			},
			{ status: 500 },
		);
	}
};
