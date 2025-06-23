import { Box, Text, Flex, Heading, Callout, Link } from "@radix-ui/themes";
import ListSwitch, { type ListOption } from "./ListSwitch";
import type { AccountWithInstance } from "./MastodonConnectForm";
import type { blueskyAccount } from "~/drizzle/schema.server";
import { CircleAlert } from "lucide-react";
import type { SubscriptionStatus } from "~/utils/auth.server";
import { useFetcher } from "react-router";

const Lists = ({
	listOptions,
	account,
	subscribed,
}: {
	listOptions: ListOption[];
	account: AccountWithInstance | typeof blueskyAccount.$inferSelect;
	subscribed: SubscriptionStatus;
}) => {
	const fetcher = useFetcher();
	return (
		<Box mt="4">
			<Heading size="3" mb="2">
				Lists
			</Heading>

			{subscribed === "free" ? (
				<Callout.Root mt="4">
					<Callout.Icon>
						<CircleAlert width="18" height="18" />
					</Callout.Icon>
					<Callout.Text>
						Access to lists requires a{" "}
						<Text
							style={{
								fontStyle: "italic",
								fontWeight: 900,
							}}
						>
							sill+
						</Text>{" "}
						subscription.{" "}
						<Link href="/settings/subscription">Subscribe now.</Link>
					</Callout.Text>
				</Callout.Root>
			) : (
				<>
					<Text as="p" size="2" mb="4">
						Sill will track any enabled lists for new links. Sill works best
						with chronological lists rather than algorithmic ones.
					</Text>
					{listOptions.length > 0 && (
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
					)}
					{subscribed === "trial" && (
						<Callout.Root mt="4">
							<Callout.Icon>
								<CircleAlert width="18" height="18" />
							</Callout.Icon>
							<Callout.Text>
								Lists are part of Sill+.{" "}
								<Link href="/settings/subscription">Subscribe now</Link> to
								maintain access.
							</Callout.Text>
						</Callout.Root>
					)}
					<Callout.Root mt="4">
						<Callout.Icon>
							<CircleAlert width="18" height="18" />
						</Callout.Icon>
						<Callout.Text size="2">
							Lists are free during Sill's beta period. Sill will charge for
							this feature in the future.
						</Callout.Text>
					</Callout.Root>
				</>
			)}
		</Box>
	);
};

export default Lists;
