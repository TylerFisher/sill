import { Box, Button } from "@radix-ui/themes";
import {
	type LoaderFunctionArgs,
	type MetaFunction,
	redirect,
} from "@remix-run/node";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { eq } from "drizzle-orm";
import BlueskyConnectForm from "~/components/forms/BlueskyConnectForm";
import Layout from "~/components/nav/Layout";
import MastodonConnectForm from "~/components/forms/MastodonConnectForm";
import PageHeading from "~/components/nav/PageHeading";
import { db } from "~/drizzle/db.server";
import { emailSettings, user } from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";
import EmailSettingForm from "~/components/forms/EmailSettingsForm";

export const meta: MetaFunction = () => [
	{ title: "Sill | Connect Your Accounts" },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const userId = await requireUserId(request);
	if (!userId) {
		return redirect("accounts/login");
	}
	const existingUser = await db.query.user.findFirst({
		columns: {},
		where: eq(user.id, userId),
		with: {
			mastodonAccounts: {
				with: {
					mastodonInstance: true,
				},
			},
			blueskyAccounts: true,
		},
	});

	const instances = await db.query.mastodonInstance.findMany({
		columns: {
			instance: true,
		},
	});

	const currentSettings = await db.query.emailSettings.findFirst({
		where: eq(emailSettings.userId, userId),
	});

	return { user: existingUser, instances, currentSettings };
};

const Connect = () => {
	const { user, instances, currentSettings } = useLoaderData<typeof loader>();
	if (!user) return null;
	const [searchParams] = useSearchParams();
	const onboarding = searchParams.get("onboarding");
	return (
		<Layout hideNav={!!onboarding}>
			<Box mb="6">
				<PageHeading
					title="Connect your accounts"
					dek="Sill connects to your Bluesky and Mastodon accounts and gathers all of the links posted to your timeline. Then, Sill aggregates those links to show you the most popular links in your network. You can connect to one or both of these services."
				/>
			</Box>
			<BlueskyConnectForm
				account={user.blueskyAccounts[0]}
				searchParams={searchParams}
			/>
			<MastodonConnectForm
				account={user.mastodonAccounts[0]}
				instances={instances}
				searchParams={searchParams}
			/>
			<EmailSettingForm currentSettings={currentSettings} />
			<Box>
				<Link to="/links">
					<Button>Show me my top links</Button>
				</Link>
			</Box>
		</Layout>
	);
};

export default Connect;
