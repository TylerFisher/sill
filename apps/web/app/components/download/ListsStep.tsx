import { Box, Flex, Heading, Spinner, Text } from "@radix-ui/themes";
import { useEffect } from "react";
import { useFetcher } from "react-router";
import type { SubscriptionStatus, AccountWithInstance } from "@sill/schema";
import type { ListOption } from "~/components/forms/ListSwitch";
import Lists from "~/components/forms/Lists";
import type { BlueskyAccount } from "./types";

interface ListsStepProps {
	blueskyAccount: BlueskyAccount | null;
	mastodonAccount: AccountWithInstance | null;
	subscribed: SubscriptionStatus;
}

function AccountLists({
	account,
	apiUrl,
	type,
	subscribed,
}: {
	account: BlueskyAccount | AccountWithInstance;
	apiUrl: string;
	type: "bluesky" | "mastodon";
	subscribed: SubscriptionStatus;
}) {
	const fetcher = useFetcher<{ lists: ListOption[] }>();
	const lists = fetcher.data?.lists?.filter((l) => l.type === type) || [];
	const isLoading = fetcher.state === "loading";
	const hasLoaded = fetcher.data !== undefined;

	useEffect(() => {
		if (fetcher.state === "idle" && !hasLoaded) {
			fetcher.load(apiUrl);
		}
	}, [fetcher, apiUrl, hasLoaded]);

	if (!hasLoaded || isLoading) {
		return (
			<Flex align="center" gap="2">
				<Spinner size="1" />
				<Text size="2">Loading lists...</Text>
			</Flex>
		);
	}

	if (lists.length === 0) {
		return (
			<Text as="p" size="2" color="gray">
				No lists found for this account.
			</Text>
		);
	}

	return <Lists listOptions={lists} account={account} subscribed={subscribed} />;
}

export default function ListsStep({
	blueskyAccount,
	mastodonAccount,
	subscribed,
}: ListsStepProps) {
	const hasBluesky = !!blueskyAccount;
	const hasMastodon = !!mastodonAccount;

	if (!hasBluesky && !hasMastodon) {
		return (
			<Text as="p" size="2" color="gray">
				Connect a social account to see your lists.
			</Text>
		);
	}

	return (
		<Flex direction="column" gap="6">
			{hasBluesky && (
				<Box>
					<Heading as="h4" size="4" mb="2">
						Bluesky Lists
					</Heading>
					<AccountLists
						account={blueskyAccount}
						apiUrl="/api/lists/bluesky"
						type="bluesky"
						subscribed={subscribed}
					/>
				</Box>
			)}
			{hasMastodon && (
				<Box>
					<Heading as="h4" size="4" mb="2">
						Mastodon Lists
					</Heading>
					<AccountLists
						account={mastodonAccount}
						apiUrl="/api/lists/mastodon"
						type="mastodon"
						subscribed={subscribed}
					/>
				</Box>
			)}
		</Flex>
	);
}
