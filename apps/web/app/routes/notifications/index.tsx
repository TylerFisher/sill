import { parseWithZod } from "@conform-to/zod";
import { Box, Flex, Heading, Link as RLink, Tabs, Text } from "@radix-ui/themes";
import { ChevronRight } from "lucide-react";
import { redirect, data, Link } from "react-router";
import { z } from "zod";
import { NotificationsProvider } from "~/components/contexts/NotificationsContext";
import NotificationForm from "~/components/forms/NotificationForm";
import type { NotificationGroupInit } from "~/components/forms/NotificationGroup";
import Layout from "~/components/nav/Layout";
import PageHeading from "~/components/nav/PageHeading";
import { LinkPost } from "~/routes/links/index";
import type { MostRecentLinkPosts } from "@sill/schema";
import type { Route } from "./+types/index";
import { requireUserFromContext } from "~/utils/context.server";
import {
	apiGetNotificationGroups,
	apiCreateNotificationGroup,
	apiGetDevices,
	apiGetNotificationGroupItems,
} from "~/utils/api-client.server";
import { useSearchParams } from "react-router";

type NotificationGroups = Awaited<ReturnType<typeof apiGetNotificationGroups>>;

export const NotificationSchema = z.object({
	id: z.string().optional(),
	format: z.enum(["email", "rss", "push"]),
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

	// Check if user has any registered devices (for push notification option)
	let hasDevices = false;
	try {
		const devices = await apiGetDevices(request);
		hasDevices = Array.isArray(devices) && devices.length > 0;
	} catch {
		hasDevices = false;
	}

	// Fetch first page of items for each saved notification group
	const groupFeeds = await Promise.all(
		notificationGroups.map(async (group) => {
			try {
				const result = await apiGetNotificationGroupItems(
					request,
					group.id,
				);
				return {
					groupId: group.id,
					groupName: group.name,
					items: result.items,
					nextCursor: result.nextCursor,
				};
			} catch (error) {
				console.error(
					`Failed to fetch items for group ${group.id}:`,
					error,
				);
				return {
					groupId: group.id,
					groupName: group.name,
					items: [],
					nextCursor: null,
				};
			}
		}),
	);

	const hasItems = groupFeeds.some((feed) => feed.items.length > 0);

	// Combine existing user data with notification groups to match expected loader signature
	const userWithNotificationGroups = {
		...existingUser,
		notificationGroups,
	};

	const bsky = existingUser.blueskyAccounts[0];
	const mastodon = existingUser.mastodonAccounts[0];

	return {
		user: userWithNotificationGroups,
		subscribed,
		email: existingUser.email,
		hasDevices,
		groupFeeds,
		hasItems,
		bsky: bsky?.handle,
		instance: mastodon?.mastodonInstance.instance,
		bookmarks: existingUser.bookmarks,
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

	const [searchParams] = useSearchParams();
	const defaultValue =
		searchParams.get("tab") || (loaderData.hasItems ? "feed" : "settings");

	return (
		<Layout>
			<Tabs.Root defaultValue={defaultValue}>
				<Tabs.List mb="4">
					<Tabs.Trigger value="feed">Feed</Tabs.Trigger>
					<Tabs.Trigger value="settings">Settings</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="feed">
					<Box mb="6">
						<PageHeading
							title="Your Notifications"
							dek="View all links from your notification feeds."
						/>
					</Box>

					{loaderData.groupFeeds.length === 0 ? (
						<Text as="p">
							You haven't set up any notifications yet. Head to the{" "}
							<Link to="?tab=settings">Settings</Link> tab to create one.
						</Text>
					) : loaderData.hasItems ? (
						<Box>
							{loaderData.groupFeeds.map((feed) => {
								if (feed.items.length === 0) return null;
								return (
									<Box key={feed.groupId} mb="6">
										<RLink asChild underline="none">
											<Link to={`/notifications/${feed.groupId}`}>
												<Flex align="center" gap="1" mb="4">
													<Heading as="h3" size="4">
														{feed.groupName}
													</Heading>
													<ChevronRight size={20} style={{ color: "var(--accent-11)" }} />
												</Flex>
											</Link>
										</RLink>
										{(() => {
											const firstItem = feed.items[0] as { id: string; itemData: MostRecentLinkPosts };
											return (
												<LinkPost
													linkPost={firstItem.itemData}
													instance={loaderData.instance}
													bsky={loaderData.bsky}
													layout="dense"
													bookmarks={loaderData.bookmarks}
													subscribed={loaderData.subscribed}
												/>
											);
										})()}
									</Box>
								);
							})}
						</Box>
					) : (
						<Text as="p">
							No notification items yet. Your filters haven't matched any
							links.
						</Text>
					)}
				</Tabs.Content>

				<Tabs.Content value="settings">
					<Box mb="6">
						<PageHeading
							title="Notification Settings"
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
							hasDevices={loaderData.hasDevices}
						/>
					</NotificationsProvider>
				</Tabs.Content>
			</Tabs.Root>
		</Layout>
	);
}
