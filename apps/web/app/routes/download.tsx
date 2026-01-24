import { Suspense, useEffect, useRef } from "react";
import { Await, useSearchParams } from "react-router";
import WelcomeContent from "~/components/download/WelcomeContent";
import { useSyncStatus } from "~/components/contexts/SyncContext";
import Layout from "~/components/nav/Layout";
import { apiFilterLinkOccurrences } from "~/utils/api-client.server";
import type { Route } from "./+types/download";
import { requireUserFromContext } from "~/utils/context.server";

export const meta: Route.MetaFunction = () => [{ title: "Sill | Welcome" }];

export const loader = async ({ request, context }: Route.LoaderArgs) => {
	const existingUser = await requireUserFromContext(context);
	const subscribed = existingUser.subscriptionStatus;
	const hasBluesky = existingUser.blueskyAccounts.length > 0;
	const hasMastodon = existingUser.mastodonAccounts.length > 0;

	const params = new URL(request.url).searchParams;
	const service = params.get("service");

	// Start the download but don't block - pass promise to client for status tracking
	const syncPromise = apiFilterLinkOccurrences(request, {
		time: 86400000, // 24 hours
		hideReposts: "include",
		fetch: true,
	})
		.then(() => "success" as const)
		.catch(() => "error" as const);

	return { service, subscribed, syncPromise, hasBluesky, hasMastodon };
};

const Download = ({ loaderData }: Route.ComponentProps) => {
	const { service, subscribed, syncPromise, hasBluesky, hasMastodon } =
		loaderData;
	const [searchParams] = useSearchParams();
	const { startSync } = useSyncStatus();
	const syncStarted = useRef(false);

	// Initialize the global sync status when the component mounts
	useEffect(() => {
		if (!syncStarted.current) {
			syncStarted.current = true;
			startSync(syncPromise, service);
		}
	}, [syncPromise, service, startSync]);

	return (
		<Layout hideNav>
			<Suspense
				fallback={
					<WelcomeContent
						subscribed={subscribed}
						hasBluesky={hasBluesky}
						hasMastodon={hasMastodon}
						searchParams={searchParams}
						syncComplete={false}
					/>
				}
			>
				<Await resolve={syncPromise}>
					{(status) => (
						<WelcomeContent
							subscribed={subscribed}
							hasBluesky={hasBluesky}
							hasMastodon={hasMastodon}
							searchParams={searchParams}
							syncComplete={status === "success"}
						/>
					)}
				</Await>
			</Suspense>
		</Layout>
	);
};

export default Download;
