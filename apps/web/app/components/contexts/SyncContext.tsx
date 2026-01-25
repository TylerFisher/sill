import {
	createContext,
	useContext,
	useState,
	useEffect,
	useRef,
	type ReactNode,
} from "react";

type SyncStatus = "syncing" | "success" | "error";

interface SyncInfo {
	id: string;
	label: string;
}

interface SyncEntry {
	label: string;
	status: SyncStatus;
}

interface SyncContextValue {
	syncs: Map<string, SyncEntry>;
	startSync: (promise: Promise<"success" | "error">, info: SyncInfo) => void;
	startServerSync: (info: SyncInfo) => void;
}

const SyncContext = createContext<SyncContextValue | null>(null);

interface SyncProviderProps {
	children: ReactNode;
	initialSyncs?: Array<{ syncId: string; label: string; status: string }>;
}

export function SyncProvider({ children, initialSyncs }: SyncProviderProps) {
	const [syncs, setSyncs] = useState<Map<string, SyncEntry>>(() => {
		const map = new Map<string, SyncEntry>();
		if (initialSyncs) {
			for (const sync of initialSyncs) {
				map.set(sync.syncId, {
					label: sync.label,
					status: sync.status as SyncStatus,
				});
			}
		}
		return map;
	});

	// Track which syncs have client-side promises (don't need polling)
	const clientTrackedSyncs = useRef<Set<string>>(new Set());

	// Poll for updates on server-hydrated syncs that are still "syncing"
	useEffect(() => {
		// Find syncs that are "syncing" but not tracked by client promises
		const needsPolling = Array.from(syncs.entries()).some(
			([id, entry]) =>
				entry.status === "syncing" && !clientTrackedSyncs.current.has(id),
		);

		if (!needsPolling) {
			return;
		}

		const pollInterval = setInterval(async () => {
			try {
				const response = await fetch("/api/sync/status");
				if (!response.ok) return;

				const serverSyncs: Array<{
					syncId: string;
					label: string;
					status: string;
				}> = await response.json();

				setSyncs((prev) => {
					const next = new Map(prev);
					let hasChanges = false;

					for (const serverSync of serverSyncs) {
						const existing = next.get(serverSync.syncId);
						// Only update if this sync exists locally, is being polled (not client-tracked),
						// and the status has changed
						if (
							existing &&
							!clientTrackedSyncs.current.has(serverSync.syncId) &&
							existing.status !== serverSync.status
						) {
							next.set(serverSync.syncId, {
								...existing,
								status: serverSync.status as SyncStatus,
							});
							hasChanges = true;
						}
					}

					return hasChanges ? next : prev;
				});
			} catch {
				// Ignore polling errors
			}
		}, 3000);

		return () => clearInterval(pollInterval);
	}, [syncs]);

	const startSync = (promise: Promise<"success" | "error">, info: SyncInfo) => {
		// Mark this sync as client-tracked (has a promise)
		clientTrackedSyncs.current.add(info.id);

		setSyncs((prev) => {
			const next = new Map(prev);
			next.set(info.id, { label: info.label, status: "syncing" });
			return next;
		});

		promise.then((result) => {
			setSyncs((prev) => {
				const next = new Map(prev);
				const entry = next.get(info.id);
				if (entry) {
					next.set(info.id, { ...entry, status: result });
				}
				return next;
			});
		});
	};

	// Start a server-tracked sync (no client-side promise, relies on polling)
	const startServerSync = (info: SyncInfo) => {
		// Don't add to clientTrackedSyncs - polling will handle status updates
		setSyncs((prev) => {
			const next = new Map(prev);
			next.set(info.id, { label: info.label, status: "syncing" });
			return next;
		});
	};

	return (
		<SyncContext.Provider value={{ syncs, startSync, startServerSync }}>
			{children}
		</SyncContext.Provider>
	);
}

export function useSyncStatus() {
	const context = useContext(SyncContext);
	if (!context) {
		throw new Error("useSyncStatus must be used within a SyncProvider");
	}
	return context;
}
