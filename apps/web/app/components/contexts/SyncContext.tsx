import { createContext, useContext, useState, type ReactNode } from "react";

type SyncStatus = "idle" | "syncing" | "success" | "error";

interface SyncContextValue {
	status: SyncStatus;
	service: string | null;
	startSync: (
		promise: Promise<"success" | "error">,
		service?: string | null
	) => void;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
	const [status, setStatus] = useState<SyncStatus>("idle");
	const [service, setService] = useState<string | null>(null);

	const startSync = (
		promise: Promise<"success" | "error">,
		svc?: string | null
	) => {
		setStatus("syncing");
		setService(svc ?? null);

		promise.then((result) => {
			setStatus(result);
		});
	};

	return (
		<SyncContext.Provider value={{ status, service, startSync }}>
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
