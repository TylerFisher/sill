import { useFetcher } from "@remix-run/react";
import { Flex, Spinner, Switch, Text } from "@radix-ui/themes";
import type { blueskyAccount, mastodonAccount } from "~/drizzle/schema.server";
import { useState } from "react";
import { set } from "zod";

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
	const fetcher = useFetcher();
	const [checked, setChecked] = useState(item.subscribed);

	const onCheckedChange = (e: boolean) => {
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
