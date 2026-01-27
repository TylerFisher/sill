import { Flex, Switch, Text } from "@radix-ui/themes";
import { useState } from "react";
import { useFetcher } from "react-router";
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
}

const ListSwitch = ({ item, account }: ListSwitchProps) => {
	const [checked, setChecked] = useState(item.subscribed);
	const { startServerSync } = useSyncStatus();
	const fetcher = useFetcher();

	const onCheckedChange = (e: boolean) => {
		const syncId = `list-${item.uri}`;

		// Only start a sync when subscribing (not unsubscribing)
		if (e) {
			// Use server-side sync tracking - the server will update the sync status
			// and the SyncContext will poll for updates
			startServerSync({
				id: syncId,
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
				syncId: e ? syncId : "",
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
				<Switch
					size="3"
					onCheckedChange={onCheckedChange}
					checked={checked}
				/>
				{item.name}
			</Flex>
		</Text>
	);
};

export default ListSwitch;
