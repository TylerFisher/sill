import { type ActionFunctionArgs, json } from "@remix-run/node";
import { parseWithZod } from "@conform-to/zod";
import { z } from "zod";
import { requireUserId } from "~/utils/auth.server";
import { prisma } from "~/db.server";

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

	await prisma.mutePhrase.delete({
		where: {
			userId_phrase: {
				userId,
				phrase: submission.value.phrase,
			},
		},
	});

	return json({});
};
