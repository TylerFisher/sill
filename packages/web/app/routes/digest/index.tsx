import { Box, Callout, Link, Tabs } from "@radix-ui/themes";
import { desc, eq } from "drizzle-orm";
import { CircleAlert } from "lucide-react";
import { useSearchParams } from "react-router";
import MonthCollapsible from "~/components/archive/MonthCollapsible";
import EmailSettingForm from "~/components/forms/EmailSettingsForm";
import Layout from "~/components/nav/Layout";
import PageHeading from "~/components/nav/PageHeading";
import SubscriptionCallout from "~/components/subscription/SubscriptionCallout";
import { db } from "~/drizzle/db.server";
import { digestItem, digestSettings, user } from "~/drizzle/schema.server";
import { isSubscribed, requireUserId } from "~/utils/auth.server";
import type { Route } from "./+types/index";

export const meta: Route.MetaFunction = () => [
	{ title: "Sill | Daily Digest" },
];

export const loader = async ({ request }: Route.LoaderArgs) => {
	const userId = await requireUserId(request);

	if (!userId) {
		throw new Response(null, {
			status: 401,
			statusText: "Unauthorized",
		});
	}

	const subscribed = await isSubscribed(userId);

	const existingUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
		with: { subscriptions: true },
	});

	if (!existingUser) {
		throw new Response(null, {
			status: 404,
			statusText: "Not Found",
		});
	}

	if (subscribed === "free") {
		throw new Response(null, {
			status: 403,
			statusText: "Forbidden - Upgrade required",
		});
	}

	const currentSettings = await db.query.digestSettings.findFirst({
		where: eq(digestSettings.userId, userId),
	});

	// Get archive items
	const items = await db.query.digestItem.findMany({
		columns: {
			id: true,
			pubDate: true,
		},
		where: eq(digestItem.userId, userId),
		orderBy: desc(digestItem.pubDate),
	});

	// Group items by month
	const itemsByMonth = items.reduce(
		(acc, item) => {
			const date = new Date(item.pubDate);
			const monthYear = `${date.getFullYear()}-${date.getMonth()}`;

			if (!acc[monthYear]) {
				acc[monthYear] = {
					month: date.toLocaleString("default", { month: "long" }),
					year: date.getFullYear(),
					items: [],
				};
			}

			acc[monthYear].items.push(item);
			return acc;
		},
		{} as Record<string, { month: string; year: number; items: typeof items }>,
	);

	return {
		currentSettings,
		email: existingUser.email,
		subscribed,
		itemsByMonth,
		userId,
		hasSettings: !!currentSettings,
	};
};

export default function Digest({ loaderData }: Route.ComponentProps) {
	const {
		currentSettings,
		email,
		subscribed,
		itemsByMonth,
		userId,
		hasSettings,
	} = loaderData;
	const [searchParams] = useSearchParams();

	// Default to archive if settings exist, otherwise default to settings
	const defaultValue =
		searchParams.get("tab") || (hasSettings ? "archive" : "settings");

	return (
		<Layout>
			<Tabs.Root defaultValue={defaultValue}>
				<Tabs.List mb="4">
					<Tabs.Trigger value="archive">Archive</Tabs.Trigger>
					<Tabs.Trigger value="settings">Settings</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="archive">
					<Box mb="6">
						<PageHeading
							title="Daily Digest Archive"
							dek="View past editions of your Daily Digest. Click on a month to view the editions for that month."
						/>
						{subscribed === "trial" && (
							<SubscriptionCallout featureName="Daily Digests" />
						)}
					</Box>

					<Box>
						{Object.entries(itemsByMonth).map(
							([monthYear, { month, year, items }], index) => (
								<Box key={monthYear} mb="4">
									<MonthCollapsible
										month={month}
										year={year}
										items={items}
										userId={userId}
										index={index}
									/>
								</Box>
							),
						)}
					</Box>
				</Tabs.Content>

				<Tabs.Content value="settings">
					<Box mb="6">
						<PageHeading
							title="Daily Digest Settings"
							dek="Sill can send you a Daily Digest at a time of your choosing. Configure your Daily Digest using the form below."
						/>
						{subscribed === "trial" && (
							<SubscriptionCallout featureName="Daily Digests" />
						)}
					</Box>

					<EmailSettingForm currentSettings={currentSettings} email={email} />
				</Tabs.Content>
			</Tabs.Root>
		</Layout>
	);
}
