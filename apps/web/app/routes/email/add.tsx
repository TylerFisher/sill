import { parseWithZod } from "@conform-to/zod";
import { data } from "react-router";
import { z } from "zod";
import { apiCreateUpdateDigestSettings } from "~/utils/api-client.server";
import { requireUserFromContext } from "~/utils/context.server";
import type { Route } from "./+types/add";

export const EmailSettingsSchema = z.object({
	time: z.string(),
	hideReposts: z.boolean().default(false),
	splitServices: z.boolean().default(false),
	topAmount: z.number().default(10),
	layout: z.string().default("default"),
	digestType: z.string(),
});

export const action = async ({ request, context }: Route.ActionArgs) => {
	await requireUserFromContext(context);

	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		schema: EmailSettingsSchema,
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
		const response = await apiCreateUpdateDigestSettings(request, {
			time: submission.value.time,
			hideReposts: submission.value.hideReposts,
			splitServices: submission.value.splitServices,
			topAmount: submission.value.topAmount,
			layout: submission.value.layout,
			digestType: submission.value.digestType,
		});

		if (!response.ok) {
			const errorData = await response.json();
			if ("error" in errorData) {
				throw new Error(errorData.error as string);
			}
			throw new Error("Failed to save settings");
		}

		return {
			result: submission.reply(),
		};
	} catch (error) {
		return data(
			{
				result: submission.reply({
					formErrors: [
						error instanceof Error ? error.message : "Failed to save settings",
					],
				}),
			},
			{
				status: 500,
			},
		);
	}
};
