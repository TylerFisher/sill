import { z } from "zod";
import type { Route } from "./+types/add";
import { parseWithZod } from "@conform-to/zod";
import { data } from "react-router";
import { notificationGroup } from "~/drizzle/schema.server";
import { uuidv7 } from "uuidv7-js";
import { requireUserId } from "~/utils/auth.server";
import { db } from "~/drizzle/db.server";

export const NotificationSchema = z.object({
	format: z.enum(["email", "rss"]),
	queries: z.preprocess(
		(value) => JSON.parse(value as string),
		z.array(
			z.object({
				category: z.object({
					id: z.string(),
					name: z.string(),
					type: z.string(),
				}),
				operator: z.string(),
				value: z.union([z.string(), z.number()]),
			}),
		),
	),
	name: z.string(),
});

export const action = async ({ request }: Route.ActionArgs) => {
	const userId = await requireUserId(request);

	if (!userId) {
		return data({ result: "Unauthorized" }, { status: 401 });
	}

	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		schema: NotificationSchema.superRefine(async (data, ctx) => {
			if (!data.queries.length) {
				ctx.addIssue({
					path: ["queries"],
					code: z.ZodIssueCode.custom,
					message: "At least one query item is required",
				});
				return;
			}
		}),
		async: true,
	});

	if (submission.status !== "success") {
		return data(
			{ result: submission.reply() },
			{
				status: submission.status === "error" ? 400 : 200,
			},
		);
	}

	const { format, queries, name } = submission.value;

	let feedUrl: string | undefined = undefined;
	const groupId = uuidv7();

	if (format === "rss") {
		feedUrl = `https://sill.social/notifications/rss/${groupId}.rss`;
	}

	await db.insert(notificationGroup).values({
		id: groupId,
		name,
		notificationType: format,
		query: queries,
		feedUrl,
		userId,
	});

	return { result: "success" };
};
