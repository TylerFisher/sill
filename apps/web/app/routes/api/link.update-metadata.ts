import { parseWithZod } from "@conform-to/zod";
import { data } from "react-router";
import { z } from "zod";
import { requireUserFromContext } from "~/utils/context.server";
import { apiUpdateLinkMetadata } from "~/utils/api-client.server";
import type { Route } from "./+types/link.update-metadata";

const UpdateLinkMetadataSchema = z.object({
	url: z.string().url(),
	metadata: z.string().transform((val) => JSON.parse(val)),
});

export const action = async ({ request, context }: Route.ActionArgs) => {
	await requireUserFromContext(context);

	const formData = await request.formData();
	const submission = parseWithZod(formData, {
		schema: UpdateLinkMetadataSchema,
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
		const result = await apiUpdateLinkMetadata(request, {
			url: submission.value.url,
			metadata: submission.value.metadata,
		});

		return data({
			result: submission.reply(),
			data: result,
		});
	} catch (error) {
		console.error("Update link metadata error:", error);

		return data(
			{
				result: submission.reply({
					formErrors: ["Failed to update link metadata. Please try again."],
				}),
			},
			{ status: 500 },
		);
	}
};
