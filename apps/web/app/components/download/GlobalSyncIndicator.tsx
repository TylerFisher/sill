import { useEffect, useRef } from "react";
import { Callout, Spinner } from "@radix-ui/themes";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { useLocation } from "react-router";
import { useSyncStatus } from "~/components/contexts/SyncContext";

export default function GlobalSyncIndicator() {
	const { status, service } = useSyncStatus();
	const location = useLocation();
	const isDownloadPage = location.pathname === "/download";

	// Track status at page load to detect if sync completes on this page
	const statusAtPageLoad = useRef(status);
	const previousPathname = useRef(location.pathname);

	// Reset when navigating to a new page
	useEffect(() => {
		if (previousPathname.current !== location.pathname) {
			statusAtPageLoad.current = status;
			previousPathname.current = location.pathname;
		}
	}, [location.pathname, status]);

	// Sync completed on this page if it was syncing at page load and is now success
	const completedOnThisPage =
		statusAtPageLoad.current === "syncing" && status === "success";

	if (status === "idle") {
		return null;
	}

	// Show success only if:
	// - On download page, OR
	// - Sync completed while on this page (was syncing at page load)
	if (status === "success") {
		if (!isDownloadPage && !completedOnThisPage) {
			return null;
		}
		return (
			<Callout.Root color="yellow" mb="4">
				<Callout.Icon>
					<CheckCircle2 width="18" height="18" />
				</Callout.Icon>
				<Callout.Text>
					Your {service || "social media"} timeline has been synced.
				</Callout.Text>
			</Callout.Root>
		);
	}

	if (status === "error") {
		return (
			<Callout.Root color="red" mb="4">
				<Callout.Icon>
					<CircleAlert width="18" height="18" />
				</Callout.Icon>
				<Callout.Text>
					There was an issue syncing your timeline. Your links will sync
					automatically in the background.
				</Callout.Text>
			</Callout.Root>
		);
	}

	return (
		<Callout.Root color="yellow" variant="soft" mb="4">
			<Callout.Icon>
				<Spinner size="1" />
			</Callout.Icon>
			<Callout.Text>
				Syncing the last 24 hours from your {service || "social media"} timeline
				in the background.
			</Callout.Text>
		</Callout.Root>
	);
}
