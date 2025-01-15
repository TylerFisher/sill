import { Box, Text, Flex, Heading, Callout, Link } from "@radix-ui/themes";
import ListSwitch, { type ListOption } from "./ListSwitch";
import type { AccountWithInstance } from "./MastodonConnectForm";
import type { blueskyAccount } from "~/drizzle/schema.server";
import { CircleAlert } from "lucide-react";
import type { SubscriptionStatus } from "~/utils/auth.server";

const Lists = ({
	listOptions,
	account,
	subscribed,
}: {
	listOptions: ListOption[];
	account: AccountWithInstance | typeof blueskyAccount.$inferSelect;
	subscribed: SubscriptionStatus;
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
			{subscribed === "free" ? (
				<Callout.Root mt="4">
					<Callout.Icon>
						<CircleAlert width="18" height="18" />
					</Callout.Icon>
					<Callout.Text>
						Access to lists requires a Sill+ subscription.{" "}
						<Link href="/settings/subscription">Subscribe now.</Link>
					</Callout.Text>
				</Callout.Root>
			) : (
				<>
					{listOptions.length > 0 && (
						<Flex direction="column" gap="4">
							{listOptions.map((list) => (
								<ListSwitch key={list.uri} item={list} account={account} />
							))}
						</Flex>
					)}
					{subscribed === "trial" && (
						<Callout.Root mt="4">
							<Callout.Icon>
								<CircleAlert width="18" height="18" />
							</Callout.Icon>
							<Callout.Text>
								Lists are part of Sill+. You have access to Sill+ for the
								duration of your 14-day free trial.{" "}
								<Link href="/settings/subscription">Subscribe now</Link> to
								maintain access.
							</Callout.Text>
						</Callout.Root>
					)}
				</>
			)}
		</Box>
	);
};

export default Lists;
