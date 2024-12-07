import { type LoaderFunctionArgs, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { eq } from "drizzle-orm";
import EmailSettingForm from "~/components/forms/EmailSettingsForm";
import Layout from "~/components/nav/Layout";
import PageHeading from "~/components/nav/PageHeading";
import { db } from "~/drizzle/db.server";
import { digestSettings } from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const userId = await requireUserId(request);

	if (!userId) {
		return redirect("/accounts/login");
	}

	const currentSettings = await db.query.digestSettings.findFirst({
		where: eq(digestSettings.userId, userId),
	});

	return { currentSettings };
};

const EmailSettings = () => {
	const { currentSettings } = useLoaderData<typeof loader>();

	return (
		<Layout>
			<PageHeading
				title="Daily Digest Settings"
				dek="Sill can send you a Daily Digest at a time of your choosing. Configure your Daily Digest here."
			/>
			<EmailSettingForm currentSettings={currentSettings} />
		</Layout>
	);
};

export default EmailSettings;
