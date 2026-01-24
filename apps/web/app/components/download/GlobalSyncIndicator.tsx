import { useEffect, useRef } from "react";
import { Callout, Flex, Spinner } from "@radix-ui/themes";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { useLocation } from "react-router";
import { useSyncStatus } from "~/components/contexts/SyncContext";

export default function GlobalSyncIndicator() {
	const { syncs } = useSyncStatus();
	const location = useLocation();
	const isDownloadPage = location.pathname === "/download";

	// Track which syncs were in progress when the page loaded
	const syncsAtPageLoad = useRef<Map<string, "syncing" | "success" | "error">>(
		new Map(),
	);
	const previousPathname = useRef(location.pathname);

	// Reset when navigating to a new page
	useEffect(() => {
		if (previousPathname.current !== location.pathname) {
			syncsAtPageLoad.current = new Map(
				Array.from(syncs.entries()).map(([id, entry]) => [id, entry.status]),
			);
			previousPathname.current = location.pathname;
		}
	}, [location.pathname, syncs]);

	// Initialize on first render
	useEffect(() => {
		if (syncsAtPageLoad.current.size === 0 && syncs.size > 0) {
			syncsAtPageLoad.current = new Map(
				Array.from(syncs.entries()).map(([id, entry]) => [id, entry.status]),
			);
		}
	}, [syncs]);

	if (syncs.size === 0) {
		return null;
	}

	const indicators: React.ReactNode[] = [];

	for (const [id, entry] of syncs.entries()) {
		const statusAtLoad = syncsAtPageLoad.current.get(id);
		const completedOnThisPage =
			statusAtLoad === "syncing" && entry.status === "success";

		if (entry.status === "success") {
			// Show success only if on download page or sync completed while on this page
			if (!isDownloadPage && !completedOnThisPage) {
				continue;
			}
			indicators.push(
				<Callout.Root key={id} color="yellow" mb="4">
					<Callout.Icon>
						<CheckCircle2 width="18" height="18" />
					</Callout.Icon>
					<Callout.Text>
						Your {entry.label} timeline has been synced.
					</Callout.Text>
				</Callout.Root>,
			);
		} else if (entry.status === "error") {
			indicators.push(
				<Callout.Root key={id} color="red" mb="4">
					<Callout.Icon>
						<CircleAlert width="18" height="18" />
					</Callout.Icon>
					<Callout.Text>
						There was an issue syncing your {entry.label} timeline. Your links
						will sync automatically in the background.
					</Callout.Text>
				</Callout.Root>,
			);
		} else if (entry.status === "syncing") {
			indicators.push(
				<Callout.Root key={id} color="yellow" variant="soft" mb="4">
					<Callout.Icon>
						<Spinner size="1" />
					</Callout.Icon>
					<Callout.Text>
						Syncing the last 24 hours from your {entry.label} timeline in the
						background.
					</Callout.Text>
				</Callout.Root>,
			);
		}
	}

	if (indicators.length === 0) {
		return null;
	}

	return <Flex direction="column">{indicators}</Flex>;
}
