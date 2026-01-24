import { Suspense, useEffect, useRef } from "react";
import { Await, useSearchParams } from "react-router";
import WelcomeContent from "~/components/download/WelcomeContent";
import { useSyncStatus } from "~/components/contexts/SyncContext";
import Layout from "~/components/nav/Layout";
import {
	apiCompleteSync,
	apiFilterLinkOccurrences,
	apiStartSync,
} from "~/utils/api-client.server";
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
	const syncId = service || "initial-sync";
	const label = service || "social media";

	// Register the sync with the server
	await apiStartSync(request, { syncId, label }).catch(() => {
		// Don't fail if sync registration fails
	});

	// Start the download but don't block - pass promise to client for status tracking
	const syncPromise = apiFilterLinkOccurrences(request, {
		time: 86400000, // 24 hours
		hideReposts: "include",
		fetch: true,
	})
		.then(async () => {
			// Mark sync as complete on server
			await apiCompleteSync(request, { syncId, status: "success" }).catch(
				() => {},
			);
			return "success" as const;
		})
		.catch(async () => {
			// Mark sync as failed on server
			await apiCompleteSync(request, { syncId, status: "error" }).catch(
				() => {},
			);
			return "error" as const;
		});

	return { service, syncId, subscribed, syncPromise, hasBluesky, hasMastodon };
};

const Download = ({ loaderData }: Route.ComponentProps) => {
	const { service, syncId, subscribed, syncPromise, hasBluesky, hasMastodon } =
		loaderData;
	const [searchParams] = useSearchParams();
	const { startSync } = useSyncStatus();
	const syncStarted = useRef(false);

	// Initialize the global sync status when the component mounts
	useEffect(() => {
		if (!syncStarted.current) {
			syncStarted.current = true;
			const label = service || "social media";
			startSync(syncPromise, { id: syncId, label });
		}
	}, [syncPromise, syncId, service, startSync]);

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
