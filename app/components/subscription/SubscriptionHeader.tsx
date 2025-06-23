import { Box, Card, Heading, Text } from "@radix-ui/themes";

export default function SubscriptionHeader() {
	return (
		<Card
			mb="6"
			style={{
				background: "var(--yellow-2)",
				border: "2px solid var(--yellow-6)",
			}}
		>
			<Box p="6">
				<Heading as="h2" size="7" mb="3" align="center" color="yellow">
					Subscribe to Sill+
				</Heading>
				<Text as="p" size="5" align="center" weight="medium" mb="4">
					Transform your social media experience with powerful automation
					and insights
				</Text>
			</Box>
		</Card>
	);
}