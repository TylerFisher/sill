import { type LoaderFunctionArgs, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { eq } from "drizzle-orm";
import EmailSettingForm from "~/components/forms/EmailSettingsForm";
import Layout from "~/components/nav/Layout";
import PageHeading from "~/components/nav/PageHeading";
import { db } from "~/drizzle/db.server";
import { emailSettings } from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const userId = await requireUserId(request);

	if (!userId) {
		return redirect("/accounts/login");
	}

	const currentSettings = await db.query.emailSettings.findFirst({
		where: eq(emailSettings.userId, userId),
	});

	return { currentSettings };
};

const EmailSettings = () => {
	const { currentSettings } = useLoaderData<typeof loader>();

	return (
		<Layout>
			<PageHeading
				title="Email Settings"
				dek="Sill can send you a daily email at a time of your choosing. Configure your email here."
			/>
			<EmailSettingForm currentSettings={currentSettings} />
		</Layout>
	);
};

export default EmailSettings;
