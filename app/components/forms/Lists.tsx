import { Box, Text, Flex, Heading, Callout } from "@radix-ui/themes";
import ListSwitch, { type ListOption } from "./ListSwitch";
import type { AccountWithInstance } from "./MastodonConnectForm";
import type { blueskyAccount } from "~/drizzle/schema.server";
import { Circle, CircleAlert } from "lucide-react";

const Lists = ({
	listOptions,
	account,
}: {
	listOptions: ListOption[];
	account: AccountWithInstance | typeof blueskyAccount.$inferSelect;
}) => {
	return (
		<Box mt="4">
			<Heading size="3" mb="2">
				Lists
			</Heading>
			<Text as="p" size="2" mb="4">
				Sill will track any enabled lists for new links. Sill works best with
				chronological lists rather than algorithmic ones.
			</Text>
			{listOptions.length > 0 && (
				<Flex direction="column" gap="4">
					{listOptions.map((list) => (
						<ListSwitch key={list.uri} item={list} account={account} />
					))}
				</Flex>
			)}
			<Callout.Root mt="4">
				<Callout.Icon>
					<CircleAlert width="18" height="18" />
				</Callout.Icon>
				<Callout.Text>
					Access to lists is free during Sill's beta period. This will be part
					of Sill's paid plan in the future.
				</Callout.Text>
			</Callout.Root>
		</Box>
	);
};

export default Lists;
