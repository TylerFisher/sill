import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import ActionCard from "./ActionCard";
import WelcomeTrialBanner from "./WelcomeTrialBanner";
import type { SubscriptionStatus } from "~/utils/auth.server";

export default function WelcomeContent({
	subscribed,
}: { subscribed: SubscriptionStatus }) {
	return (
		<Box maxWidth="600px">
			<Heading as="h2" mb="2" size="8">
				Welcome!
			</Heading>
			<Text as="p" mb="6" size="4" color="gray">
				Here's everything you can do with Sill.
			</Text>

			<Flex direction="column" gap="4">
				<ActionCard
					title="View Your Links"
					description="See what's trending across your network in real-time. Your personalized link feed is ready to explore."
					buttonText="View popular links"
					buttonTo="/links"
					buttonVariant="solid"
				/>

				{subscribed !== "free" && (
					<ActionCard
						title="Daily Digest"
						description="Get a curated email or RSS feed of the most popular links from your network, delivered daily."
						buttonText="Set up Daily Digest"
						buttonTo="/email"
						isPremium
					/>
				)}

				{subscribed !== "free" && (
					<ActionCard
						title="Custom Notifications"
						description="Create personalized alerts for trending topics, keywords, or popularity thresholds."
						buttonText="Create notifications"
						buttonTo="/notifications"
						isPremium
					/>
				)}

				<ActionCard
					title="Connect More Accounts"
					description="Add more Bluesky and Mastodon accounts, plus subscribe to additional lists and feeds."
					buttonText="Connect accounts"
					buttonTo="/settings?tab=connect"
				/>
			</Flex>
		</Box>
	);
}
