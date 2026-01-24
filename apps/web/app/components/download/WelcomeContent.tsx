import { Box, Card, Flex, Grid, Heading, Text } from "@radix-ui/themes";
import PageHeading from "~/components/nav/PageHeading";
import type { SubscriptionStatus } from "@sill/schema";
import ActionCard from "./ActionCard";
import BlueskyAuthForm from "~/components/forms/BlueskyAuthForm";
import MastodonAuthForm from "~/components/forms/MastodonAuthForm";

interface WelcomeContentProps {
	subscribed: SubscriptionStatus;
	hasBluesky: boolean;
	hasMastodon: boolean;
	searchParams: URLSearchParams;
	syncComplete: boolean;
}

export default function WelcomeContent({
	subscribed,
	hasBluesky,
	hasMastodon,
	searchParams,
	syncComplete,
}: WelcomeContentProps) {
	const showConnectBluesky = !hasBluesky;
	const showConnectMastodon = !hasMastodon;

	return (
		<Box maxWidth="600px">
			<PageHeading
				title="You're all set!"
				dek="Your account is ready. While your timeline syncs, set up additional features below."
			/>

			<Grid
				columns={{
					initial: "1",
					sm: "2",
				}}
				gap="4"
			>
				{syncComplete && (
					<ActionCard
						title="View Your Links"
						description="See what's trending across your network in real-time. Your personalized link feed is ready to explore."
						buttonText="View popular links"
						buttonTo="/links"
						buttonVariant="solid"
					/>
				)}

				{showConnectBluesky && (
					<Card size="3" style={{ height: "100%" }}>
						<Flex direction="column" gap="3" style={{ height: "100%" }}>
							<Heading as="h3" size="5">
								Connect Bluesky
							</Heading>
							<Text color="gray" size="3">
								Add a Bluesky account to see links from your network.
							</Text>
							<BlueskyAuthForm mode="connect" searchParams={searchParams} />
						</Flex>
					</Card>
				)}

				{showConnectMastodon && (
					<Card size="3" style={{ height: "100%" }}>
						<Flex direction="column" gap="3" style={{ height: "100%" }}>
							<Heading as="h3" size="5">
								Connect Mastodon
							</Heading>
							<Text color="gray" size="3">
								Add a Mastodon account to see links from your network.
							</Text>
							<MastodonAuthForm mode="connect" searchParams={searchParams} />
						</Flex>
					</Card>
				)}

				{subscribed !== "free" && (
					<ActionCard
						title="Daily Digest"
						description="Get a curated email or RSS feed of the most popular links from your network, delivered daily."
						buttonText="Set up Daily Digest"
						buttonTo="/email"
					/>
				)}

				{subscribed !== "free" && (
					<ActionCard
						title="Notifications"
						description="Create personalized alerts for trending topics, keywords, or popularity thresholds."
						buttonText="Create notifications"
						buttonTo="/notifications"
					/>
				)}

				{!syncComplete && (hasBluesky || hasMastodon) && (
					<ActionCard
						title="Manage Connections"
						description="View and manage your connected accounts, or subscribe to additional lists and feeds."
						buttonText="Manage connections"
						buttonTo="/settings/connections"
					/>
				)}
			</Grid>
		</Box>
	);
}
