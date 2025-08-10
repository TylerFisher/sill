import { Suspense } from "react";
import { Await } from "react-router";
import ErrorState from "~/components/download/ErrorState";
import LoadingState from "~/components/download/LoadingState";
import WelcomeContent from "~/components/download/WelcomeContent";
import Layout from "~/components/nav/Layout";
import { apiFilterLinkOccurrences } from "~/utils/api-client.server";
import type { Route } from "./+types/download";
import { requireUserFromContext } from "~/utils/context.server";

export const meta: Route.MetaFunction = () => [{ title: "Sill | Downloading" }];

export const loader = async ({ request, context }: Route.LoaderArgs) => {
	const existingUser = await requireUserFromContext(context);
	const subscribed = existingUser.subscriptionStatus;

	const params = new URL(request.url).searchParams;
	const service = params.get("service");

	const promise = apiFilterLinkOccurrences(request, {
		time: 86400000, // 24 hours
		hideReposts: false,
		fetch: true,
	})
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
