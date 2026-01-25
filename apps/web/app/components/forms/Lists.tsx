import { Box, Flex, Heading, Spinner, Text } from "@radix-ui/themes";
import { useFetcher } from "react-router";
import type { blueskyAccount, SubscriptionStatus, AccountWithInstance } from "@sill/schema";
import ListSwitch, { type ListOption } from "./ListSwitch";

const Lists = ({
	listOptions,
	account,
	loading = false,
}: {
	listOptions: ListOption[];
	account: AccountWithInstance | typeof blueskyAccount.$inferSelect;
	subscribed?: SubscriptionStatus;
	loading?: boolean;
}) => {
	const fetcher = useFetcher();
	return (
		<Box mt="4">
			<Heading size="3" mb="2">
				Lists
			</Heading>

			<Text as="p" size="2" mb="4">
				Sill will track any enabled lists for new links. Sill works best with
				chronological lists rather than algorithmic ones.
			</Text>
			{loading ? (
				<Flex align="center" gap="2">
					<Spinner />
					<Text size="2">Loading lists...</Text>
				</Flex>
			) : (
				listOptions.length > 0 && (
					<Flex direction="column" gap="4">
						{listOptions.map((list) => (
							<ListSwitch
								key={list.uri}
								item={list}
								account={account}
								fetcher={fetcher}
							/>
						))}
					</Flex>
				)
			)}
		</Box>
	);
};

export default Lists;
