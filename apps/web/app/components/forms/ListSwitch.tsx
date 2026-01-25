import { Flex, Spinner, Switch, Text } from "@radix-ui/themes";
import { useEffect, useRef, useState } from "react";
import type { useFetcher } from "react-router";
import type { blueskyAccount, mastodonAccount } from "@sill/schema";
import { useSyncStatus } from "~/components/contexts/SyncContext";

export interface ListOption {
	name: string;
	uri: string;
	type: "bluesky" | "mastodon";
	subscribed: boolean;
}

interface ListSwitchProps {
	item: ListOption;
	account:
		| typeof blueskyAccount.$inferSelect
		| typeof mastodonAccount.$inferSelect;
	fetcher: ReturnType<typeof useFetcher>;
}

const ListSwitch = ({ item, account, fetcher }: ListSwitchProps) => {
	const [checked, setChecked] = useState(item.subscribed);
	const { startSync } = useSyncStatus();
	const pendingSyncRef = useRef<{
		resolve: (result: "success" | "error") => void;
	} | null>(null);

	// Track fetcher state changes to resolve the sync promise
	useEffect(() => {
		if (pendingSyncRef.current && fetcher.state === "idle") {
			const data = fetcher.data as { error?: string } | undefined;
			const hasError = data?.error;
			pendingSyncRef.current.resolve(hasError ? "error" : "success");
			pendingSyncRef.current = null;
		}
	}, [fetcher.state, fetcher.data]);

	const onCheckedChange = (e: boolean) => {
		// Only start a sync when subscribing (not unsubscribing)
		if (e) {
			const syncPromise = new Promise<"success" | "error">((resolve) => {
				pendingSyncRef.current = { resolve };
			});

			startSync(syncPromise, {
				id: `list-${item.uri}`,
				label: item.name,
			});
		}

		fetcher.submit(
			{
				uri: item.uri,
				name: item.name,
				subscribe: e,
				accountId: account?.id,
				type: item.type,
			},
			{
				method: "post",
				action: "/api/list/subscribe",
			},
		);
		setChecked(e);
	};

	return (
		<Text as="label" size="2">
			<Flex gap="2">
				{fetcher.state === "submitting" ? (
					<Spinner size="3" />
				) : (
					<Switch
						size="3"
						onCheckedChange={onCheckedChange}
						checked={checked}
					/>
				)}
				{item.name}
			</Flex>
		</Text>
	);
};

export default ListSwitch;
