import { parseWithZod } from "@conform-to/zod";
import { Box } from "@radix-ui/themes";
import { redirect, data } from "react-router";
import { z } from "zod";
import { NotificationsProvider } from "~/components/contexts/NotificationsContext";
import NotificationForm from "~/components/forms/NotificationForm";
import type { NotificationGroupInit } from "~/components/forms/NotificationGroup";
import Layout from "~/components/nav/Layout";
import PageHeading from "~/components/nav/PageHeading";
import type { Route } from "./+types/index";
import { requireUserFromContext } from "~/utils/context.server";
import {
	apiGetNotificationGroups,
	apiCreateNotificationGroup,
} from "~/utils/api-client.server";

type NotificationGroups = Awaited<ReturnType<typeof apiGetNotificationGroups>>;

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

export const action = async ({ request, context }: Route.ActionArgs) => {
	await requireUserFromContext(context);

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

			let existingGroups: NotificationGroups;
			try {
				existingGroups = await apiGetNotificationGroups(request);
			} catch (error) {
				console.error(
					"Failed to fetch notification groups for validation:",
					error,
				);
				existingGroups = [];
			}

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

	if (submission.status !== "success") {
		return data(
			{ result: submission.reply() },
			{
				status: submission.status === "error" ? 400 : 200,
			},
		);
	}

	const { id, format, queries, name } = submission.value;

	try {
		await apiCreateNotificationGroup(request, {
			id,
			format,
			queries,
			name,
		});

		return data({ result: submission.reply() }, { status: 200 });
	} catch (error) {
		console.error("Failed to create notification group:", error);
		return data(
			{
				result: submission.reply({
					fieldErrors: { root: ["Failed to create notification group"] },
				}),
			},
			{ status: 500 },
		);
	}
};

export const loader = async ({ context, request }: Route.LoaderArgs) => {
	const existingUser = await requireUserFromContext(context);
	const subscribed = existingUser.subscriptionStatus;

	if (subscribed === "free") {
		return redirect("/settings/subscription");
	}

	// Get notification groups via API
	let notificationGroups: NotificationGroups;
	try {
		notificationGroups = await apiGetNotificationGroups(request);
	} catch (error) {
		console.error("Failed to fetch notification groups:", error);
		notificationGroups = [];
	}

	// Combine existing user data with notification groups to match expected loader signature
	const userWithNotificationGroups = {
		...existingUser,
		notificationGroups,
	};

	return {
		user: userWithNotificationGroups,
		subscribed,
		email: existingUser.email,
	};
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

	const allLists = [
		...loaderData.user.blueskyAccounts.flatMap((account) => account.lists),
		...loaderData.user.mastodonAccounts.flatMap((account) => account.lists),
	];

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
				<NotificationForm
					lastResult={actionData?.result}
					allLists={allLists}
					email={loaderData.email}
				/>
			</NotificationsProvider>
		</Layout>
	);
}
