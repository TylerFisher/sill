import type { Route } from "./+types/index";
import { eq } from "drizzle-orm";
import { redirect } from "react-router";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";
import Layout from "~/components/nav/Layout";
import NotificationForm from "~/components/forms/NotificationForm";
import PageHeading from "~/components/nav/PageHeading";
import { Box } from "@radix-ui/themes";

export const loader = async ({ request }: Route.LoaderArgs) => {
	const userId = await requireUserId(request);

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

	return { user: existingUser };
};

export const meta: Route.MetaFunction = () => [
	{ title: "Sill | Notifications" },
];

export default function Notifications({ loaderData }: Route.ComponentProps) {
	return (
		<Layout>
			<Box mb="4">
				<PageHeading
					title="Notifications"
					dek="Sill can send you notifications for when links meet certain criteria that you define."
				/>
			</Box>
			<NotificationForm />
		</Layout>
	);
}
