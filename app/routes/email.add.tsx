import { parseWithZod } from "@conform-to/zod";
import { type ActionFunctionArgs, data } from "@remix-run/node";
import { uuidv7 } from "uuidv7-js";
import { z } from "zod";
import { digestSettings } from "~/drizzle/schema.server";
import { db } from "~/drizzle/db.server";
import { requireUserId } from "~/utils/auth.server";

export const EmailSettingsSchema = z.object({
	time: z.string(),
	hideReposts: z.boolean().default(false),
	splitServices: z.boolean().default(false),
	topAmount: z.number().default(10),
});

export const action = async ({ request }: ActionFunctionArgs) => {
	const userId = await requireUserId(request);
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

	await db
		.insert(digestSettings)
		.values({
			id: uuidv7(),
			userId,
			scheduledTime: submission.value.time,
			hideReposts: submission.value.hideReposts,
			splitServices: submission.value.splitServices,
			topAmount: submission.value.topAmount,
		})
		.onConflictDoUpdate({
			target: [digestSettings.userId],
			set: {
				scheduledTime: submission.value.time,
				hideReposts: submission.value.hideReposts,
				splitServices: submission.value.splitServices,
				topAmount: submission.value.topAmount,
			},
		});

	return {
		result: submission.reply(),
	};
};
