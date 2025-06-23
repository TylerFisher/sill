import { Box, Grid } from "@radix-ui/themes";
import ActionCard from "./ActionCard";
import PageHeading from "~/components/nav/PageHeading";
import type { SubscriptionStatus } from "~/utils/auth.server";

export default function WelcomeContent({
	subscribed,
}: { subscribed: SubscriptionStatus }) {
	return (
		<Box maxWidth="600px">
			<PageHeading
				title="You're all set!"
				dek="Your accounts are connected and ready to go. Start exploring popular links from your network or set up additional features below."
			/>

			<Grid
				columns={{
					initial: "1",
					sm: "2",
				}}
				gap="4"
			>
				<ActionCard
					title="View Your Links"
					description="See what's trending across your network in real-time. Your personalized link feed is ready to explore."
					buttonText="View popular links"
					buttonTo="/links"
					buttonVariant="solid"
				/>
				<ActionCard
					title="Connect"
					description="Add more Bluesky and Mastodon accounts, plus subscribe to additional lists and feeds."
					buttonText="Connect accounts"
					buttonTo="/settings?tab=connect"
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
						title="Notifications"
						description="Create personalized alerts for trending topics, keywords, or popularity thresholds."
						buttonText="Create notifications"
						buttonTo="/notifications"
						isPremium
					/>
				)}
			</Grid>
		</Box>
	);
}
