import type { Route } from "./+types/index";
import { eq } from "drizzle-orm";
import { redirect } from "react-router";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import { isSubscribed, requireUserId } from "~/utils/auth.server";
import Layout from "~/components/nav/Layout";
import NotificationForm from "~/components/forms/NotificationForm";
import PageHeading from "~/components/nav/PageHeading";
import { Box, Callout, Link } from "@radix-ui/themes";
import { z } from "zod";
import { parseWithZod } from "@conform-to/zod";
import { data } from "react-router";
import { notificationGroup } from "~/drizzle/schema.server";
import { uuidv7 } from "uuidv7-js";
import { NotificationsProvider } from "~/components/contexts/NotificationsContext";
import type { NotificationGroupInit } from "~/components/forms/NotificationGroup";
import { CircleAlert } from "lucide-react";

export const NotificationSchema = z.object({
	id: z.string().optional(),
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
	name: z.string().max(100),
});

export const action = async ({ request }: Route.ActionArgs) => {
	const userId = await requireUserId(request);

	if (!userId) {
		throw new Error("Unauthorized");
	}

	const notificationUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
	});

	if (!notificationUser) {
		throw new Error("Unauthorized");
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

			const existingGroups = await db.query.notificationGroup.findMany({
				where: eq(notificationGroup.userId, userId),
			});

			for (const group of existingGroups) {
				if (group.name === data.name && group.id !== data.id) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: "A group with this name already exists",
					});
					return;
				}

				if (
					JSON.stringify(group.query) === JSON.stringify(data.queries) &&
					group.id !== data.id
				) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: "A group with these queries already exists",
					});
					return;
				}
			}
		}),
		async: true,
	});

	console.log(submission.status);

	if (submission.status !== "success") {
		return data(
			{ result: submission.reply() },
			{
				status: submission.status === "error" ? 400 : 200,
			},
		);
	}

	const { id, format, queries, name } = submission.value;

	let feedUrl: string | undefined = undefined;
	const groupId = id || uuidv7();

	if (format === "rss") {
		feedUrl = `https://sill.social/notifications/rss/${groupId}.rss`;
	}

	await db
		.insert(notificationGroup)
		.values({
			id: groupId,
			name,
			notificationType: format,
			query: queries,
			feedUrl,
			userId,
		})
		.onConflictDoUpdate({
			target: [notificationGroup.id],
			set: {
				name,
				notificationType: format,
				query: queries,
				feedUrl,
				userId,
			},
		})
		.returning({
			id: notificationGroup.id,
		});

	return data({ result: submission.reply() }, { status: 200 });
};

export const loader = async ({ request }: Route.LoaderArgs) => {
	const userId = await requireUserId(request);
	const subscribed = await isSubscribed(userId);

	if (!userId) {
		return redirect("/accounts/login") as never;
	}

	const existingUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
		with: {
			notificationGroups: true,
		},
	});

	if (!existingUser) {
		return redirect("/accounts/login") as never;
	}

	if (subscribed === "free") {
		return redirect("/settings/subscription") as never;
	}

	return { user: existingUser, subscribed };
};

export const meta: Route.MetaFunction = () => [
	{ title: "Sill | Notifications" },
];

export default function Notifications({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	let initial: NotificationGroupInit[] = loaderData.user.notificationGroups.map(
		(group) => ({
			...group,
			saved: true,
		}),
	);
	if (loaderData.user.notificationGroups.length === 0) {
		initial = [];
	}

	return (
		<Layout>
			<Box mb="4">
				<PageHeading
					title="Notifications"
					dek="Sill can send you notifications for when links meet certain criteria that you define."
				/>
			</Box>
			<NotificationsProvider
				initial={{
					notifications: initial,
				}}
			>
				{loaderData.subscribed === "trial" && (
					<Callout.Root mb="4">
						<Callout.Icon>
							<CircleAlert width="18" height="18" />
						</Callout.Icon>
						<Callout.Text size="2">
							Notifications are part of Sill+. You have access to Sill+ for the
							duration of your 14-day free trial.{" "}
							<Link href="/settings/subscription">Subscribe now</Link> to
							maintain access.
						</Callout.Text>
					</Callout.Root>
				)}

				<NotificationForm lastResult={actionData?.result} />
			</NotificationsProvider>
		</Layout>
	);
}
