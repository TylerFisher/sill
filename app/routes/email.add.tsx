import { parseWithZod } from "@conform-to/zod";
import { type ActionFunctionArgs, data } from "@remix-run/node";
import { uuidv7 } from "uuidv7-js";
import { z } from "zod";
import {
	digestLayout,
	digestRssFeed,
	digestSettings,
	digestType,
	user,
} from "~/drizzle/schema.server";
import { db } from "~/drizzle/db.server";
import { requireUserId } from "~/utils/auth.server";
import { eq } from "drizzle-orm";

export const EmailSettingsSchema = z.object({
	time: z.string(),
	hideReposts: z.boolean().default(false),
	splitServices: z.boolean().default(false),
	topAmount: z.number().default(10),
	layout: z.string().default("default"),
	digestType: z.string(),
});

export const action = async ({ request }: ActionFunctionArgs) => {
	const userId = await requireUserId(request);
	const requestUrl = new URL(request.url);
	const baseUrl = `${requestUrl.origin}/digest`;

	const existingUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
	});

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

	const submittedDigestType = digestType.enumValues.find(
		(value) => value === submission.value.digestType,
	);

	const submittedLayout = digestLayout.enumValues.find(
		(value) => value === submission.value.layout,
	);

	const settings = await db
		.insert(digestSettings)
		.values({
			id: uuidv7(),
			userId,
			scheduledTime: submission.value.time,
			hideReposts: submission.value.hideReposts,
			splitServices: submission.value.splitServices,
			topAmount: submission.value.topAmount,
			layout: submittedLayout,
			digestType: submittedDigestType,
		})
		.onConflictDoUpdate({
			target: [digestSettings.userId],
			set: {
				scheduledTime: submission.value.time,
				hideReposts: submission.value.hideReposts,
				splitServices: submission.value.splitServices,
				topAmount: submission.value.topAmount,
				layout: submittedLayout,
				digestType: submittedDigestType,
			},
		})
		.returning({
			id: digestSettings.id,
		});

	if (
		submittedDigestType ===
		digestType.enumValues.find((value) => value === "rss")
	) {
		await db
			.insert(digestRssFeed)
			.values({
				id: uuidv7(),
				userId,
				digestSettings: settings[0].id,
				feedUrl: `${baseUrl}/${userId}.rss`,
				title: `Sill Digest for ${existingUser?.name}`,
				description: "Daily links from your personal social network",
			})
			.onConflictDoUpdate({
				target: [digestRssFeed.digestSettings],
				set: {
					feedUrl: `${baseUrl}/${userId}.rss`,
					title: `Sill Digest for ${existingUser?.name}`,
					description: "Daily links from your personal social network",
				},
			});
	}

	return {
		result: submission.reply(),
	};
};
