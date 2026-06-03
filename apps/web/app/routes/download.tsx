import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import WelcomeContent from "~/components/download/WelcomeContent";
import { useSyncStatus } from "~/components/contexts/SyncContext";
import Layout from "~/components/nav/Layout";
import {
	apiCompleteSync,
	apiFilterLinkOccurrences,
	apiStartSync,
	apiGetDigestSettings,
} from "~/utils/api-client.server";
import type { Route } from "./+types/download";
import { requireUserFromContext } from "~/utils/context.server";

export const meta: Route.MetaFunction = () => [{ title: "Sill | Welcome" }];

export const loader = async ({ request, context }: Route.LoaderArgs) => {
	const existingUser = await requireUserFromContext(context);
	const subscribed = existingUser.subscriptionStatus;

	const params = new URL(request.url).searchParams;
	const service = params.get("service");
	const syncId = service || "initial-sync";
	const label = service || "social media";

	const digestSettingsPromise = apiGetDigestSettings(request).catch(() => ({
		settings: undefined,
	}));

	// Bluesky data is served by the AppView (the DID is registered as a seed at
	// auth time), so a Bluesky signup has no DB sync to run — show the welcome
	// screen without one. Mastodon still syncs its links from the DB.
	const skipSync = service === "Bluesky";
	if (skipSync) {
		return {
			service,
			syncId,
			subscribed,
			syncPromise: Promise.resolve("success" as const),
			skipSync,
			user: existingUser,
			digestSettingsPromise,
		};
	}

	await apiStartSync(request, { syncId, label }).catch(() => {});

	const syncPromise = apiFilterLinkOccurrences(request, {
		time: 86400000,
		hideReposts: "include",
		fetch: true,
	})
		.then(async () => {
			await apiCompleteSync(request, { syncId, status: "success" }).catch(
				() => {},
			);
			return "success" as const;
		})
		.catch(async () => {
			await apiCompleteSync(request, { syncId, status: "error" }).catch(
				() => {},
			);
			return "error" as const;
		});

	return {
		service,
		syncId,
		subscribed,
		syncPromise,
		skipSync,
		user: existingUser,
		digestSettingsPromise,
	};
};

const Download = ({ loaderData }: Route.ComponentProps) => {
	const {
		service,
		syncId,
		subscribed,
		syncPromise,
		skipSync,
		user,
		digestSettingsPromise,
	} = loaderData;
	const [searchParams] = useSearchParams();
	const { startSync } = useSyncStatus();
	const syncStarted = useRef(false);

	useEffect(() => {
		// No sync runs for a Bluesky signup (AppView-backed), so don't surface a
		// sync indicator — just show the welcome screen.
		if (!skipSync && !syncStarted.current) {
			syncStarted.current = true;
			const label = service || "social media";
			startSync(syncPromise, { id: syncId, label });
		}
	}, [syncPromise, syncId, service, startSync, skipSync]);

	return (
		<Layout hideNav>
			<WelcomeContent
				subscribed={subscribed}
				searchParams={searchParams}
				user={user}
				digestSettingsPromise={digestSettingsPromise}
			/>
		</Layout>
	);
};

export default Download;
