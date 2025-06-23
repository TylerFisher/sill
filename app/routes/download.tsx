import type { Route } from "./+types/download";
import { Await, redirect } from "react-router";
import { Suspense } from "react";
import Layout from "~/components/nav/Layout";
import LoadingState from "~/components/download/LoadingState";
import ErrorState from "~/components/download/ErrorState";
import WelcomeContent from "~/components/download/WelcomeContent";
import { isSubscribed, requireUserId } from "~/utils/auth.server";
import { filterLinkOccurrences } from "~/utils/links.server";
import { eq } from "drizzle-orm";
import { user } from "~/drizzle/schema.server";
import { db } from "~/drizzle/db.server";

export const meta: Route.MetaFunction = () => [{ title: "Sill | Downloading" }];

export const loader = async ({ request }: Route.LoaderArgs) => {
	const userId = await requireUserId(request);
	const existingUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
		with: {
			subscriptions: true,
			blueskyAccounts: true,
			mastodonAccounts: true,
		},
	});

	if (!existingUser) {
		return redirect("/accounts/login") as never;
	}

	const subscribed = await isSubscribed(userId);

	const params = new URL(request.url).searchParams;
	const service = params.get("service");

	const promise = filterLinkOccurrences({ userId, fetch: true })
		.then(() => ({ promise: "success" }))
		.catch(() => ({ promise: "error" }));

	return { promise, service, subscribed };
};

const Download = ({ loaderData }: Route.ComponentProps) => {
	const { promise, service, subscribed } = loaderData;

	return (
		<Layout hideNav>
			<Suspense fallback={<LoadingState service={service} />}>
				<Await resolve={promise} errorElement={<ErrorState />}>
					{() => <WelcomeContent subscribed={subscribed} />}
				</Await>
			</Suspense>
		</Layout>
	);
};

export default Download;
