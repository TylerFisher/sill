import type { Route } from "./+types/index";
import { redirect } from "react-router";
import { eq } from "drizzle-orm";
import EmailSettingForm from "~/components/forms/EmailSettingsForm";
import Layout from "~/components/nav/Layout";
import PageHeading from "~/components/nav/PageHeading";
import { db } from "~/drizzle/db.server";
import { digestSettings, user } from "~/drizzle/schema.server";
import { isSubscribed, requireUserId } from "~/utils/auth.server";
import { Callout, Link } from "@radix-ui/themes";
import { CircleAlert } from "lucide-react";

export const meta: Route.MetaFunction = () => [
	{ title: "Sill | Daily Digest Settings" },
];
export const loader = async ({ request }: Route.LoaderArgs) => {
	const userId = await requireUserId(request);

	if (!userId) {
		return redirect("/accounts/login") as never;
	}

	const subscribed = await isSubscribed(userId);

	const existingUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
		with: { subscriptions: true },
	});

	if (!existingUser) {
		return redirect("/accounts/login") as never;
	}

	if (subscribed === "free") {
		return redirect("/settings/subscription") as never;
	}

	const currentSettings = await db.query.digestSettings.findFirst({
		where: eq(digestSettings.userId, userId),
	});

	return { currentSettings, email: existingUser.email, subscribed };
};

const EmailSettings = ({ loaderData }: Route.ComponentProps) => {
	const { currentSettings, email } = loaderData;

	return (
		<Layout>
			<PageHeading
				title="Daily Digest Settings"
				dek="Sill can send you a Daily Digest at a time of your choosing. Configure your Daily Digest here."
			/>
			{loaderData.subscribed === "trial" && (
				<Callout.Root mb="4">
					<Callout.Icon>
						<CircleAlert width="18" height="18" />
					</Callout.Icon>
					<Callout.Text size="2">
						Daily Digests are part of Sill+.{" "}
						<Link href="/settings/subscription">Subscribe now</Link> to maintain
						access.
					</Callout.Text>
				</Callout.Root>
			)}
			<Callout.Root mb="4">
				<Callout.Icon>
					<CircleAlert width="18" height="18" />
				</Callout.Icon>
				<Callout.Text size="2">
					Daily Digests are free during Sill's beta period. Sill will charge for
					this feature in the future.
				</Callout.Text>
			</Callout.Root>

			<EmailSettingForm currentSettings={currentSettings} email={email} />
		</Layout>
	);
};

export default EmailSettings;
