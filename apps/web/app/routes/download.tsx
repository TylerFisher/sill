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

	await apiStartSync(request, { syncId, label }).catch(() => {});

	const digestSettingsPromise = apiGetDigestSettings(request).catch(() => ({
		settings: undefined,
	}));

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
		user: existingUser,
		digestSettingsPromise,
	};
};

const Download = ({ loaderData }: Route.ComponentProps) => {
	const { service, syncId, subscribed, syncPromise, user, digestSettingsPromise } =
		loaderData;
	const [searchParams] = useSearchParams();
	const { startSync } = useSyncStatus();
	const syncStarted = useRef(false);

	useEffect(() => {
		if (!syncStarted.current) {
			syncStarted.current = true;
			const label = service || "social media";
			startSync(syncPromise, { id: syncId, label });
		}
	}, [syncPromise, syncId, service, startSync]);

	return (
		<Layout hideNav>
			<WelcomeContent
				subscribed={subscribed}
				searchParams={searchParams}
				syncPromise={syncPromise}
				user={user}
				digestSettingsPromise={digestSettingsPromise}
			/>
		</Layout>
	);
};

export default Download;
