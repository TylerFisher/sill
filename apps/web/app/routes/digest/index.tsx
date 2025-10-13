import { Box, Tabs } from "@radix-ui/themes";
import { useSearchParams } from "react-router";
import MonthCollapsible from "~/components/archive/MonthCollapsible";
import EmailSettingForm from "~/components/forms/EmailSettingsForm";
import Layout from "~/components/nav/Layout";
import PageHeading from "~/components/nav/PageHeading";
import SubscriptionCallout from "~/components/subscription/SubscriptionCallout";
import type { Route } from "./+types/index";
import {
	apiGetDigestItemsByMonth,
	apiGetDigestSettings,
} from "~/utils/api-client.server";
import { requireUserFromContext } from "~/utils/context.server";

export const meta: Route.MetaFunction = () => [
	{ title: "Sill | Daily Digest" },
];

export const loader = async ({ context, request }: Route.LoaderArgs) => {
	const existingUser = await requireUserFromContext(context);
	const userId = existingUser.id;
	const subscribed = existingUser.subscriptionStatus;

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

	// Get digest settings via API
	const settingsResult = await apiGetDigestSettings(request);
	const currentSettings = settingsResult.settings;

	// Get digest items by month via API
	const digestResult = await apiGetDigestItemsByMonth(request);

	// Convert pubDate strings back to Date objects
	const itemsByMonth = Object.fromEntries(
		Object.entries(digestResult.itemsByMonth).map(([key, monthData]) => [
			key,
			{
				...monthData,
				items: monthData.items.map((item: { id: string; pubDate: string }) => ({
					...item,
					pubDate: new Date(`${item.pubDate}Z`),
				})),
			},
		]),
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
						{/* {subscribed === "trial" && ( */}
						<SubscriptionCallout featureName="Daily Digests" />
						{/* )} */}
					</Box>

					<EmailSettingForm currentSettings={currentSettings} email={email} />
				</Tabs.Content>
			</Tabs.Root>
		</Layout>
	);
}
