import { Box, Flex, Heading, Spinner, Text } from "@radix-ui/themes";
import type {
	blueskyAccount,
	SubscriptionStatus,
	AccountWithInstance,
} from "@sill/schema";
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
	return (
		<Box mt="4">
			<Heading size="3" mb="2">
				Lists
			</Heading>

			{loading ? (
				<Flex align="center" gap="2">
					<Spinner />
					<Text size="2">Loading lists...</Text>
				</Flex>
			) : (
				listOptions.length > 0 && (
					<Flex direction="column" gap="4">
						{listOptions.map((list) => (
							<ListSwitch key={list.uri} item={list} account={account} />
						))}
					</Flex>
				)
			)}
		</Box>
	);
};

export default Lists;
