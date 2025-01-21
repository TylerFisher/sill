// app/components/marketing/Features.tsx
import { Badge, Box, Card, Flex, Grid, Heading, Text } from "@radix-ui/themes";
import styles from "./Features.module.css";

const features = [
	{
		title: "Smart Link Aggregation",
		description:
			"Automatically collect and rank links shared across your social networks based on popularity within your trusted circle.",
	},
	{
		title: "Trending Links",
		description:
			"See what's trending across the open social web in real-time. Open to everyone, not just people with Sill accounts.",
	},
	{
		title: "Open source",
		description:
			"The entire codebase is open source, so you can host your own instance and customize it to your needs.",
	},
	{
		title: "Custom Lists & Feeds",
		description: "Track links from your favorite custom lists and feeds.",
		plusFeature: true,
	},
	{
		title: "Daily Digest",
		description:
			"Get a curated email or RSS feed of the most important links from your network, delivered at your preferred time.",
		plusFeature: true,
	},
	{
		title: "Custom Notifications",
		description:
			"Set up personalized email or RSS alerts for any criteria you define, from popularity thresholds to specific keywords.",
		plusFeature: true,
	},
];

const Features = () => {
	return (
		<Box className={styles.features}>
			<Heading size="8" align="center" mb="6">
				Features
			</Heading>

			<Grid columns={{ initial: "1", sm: "2", md: "3" }} gap="4">
				{features.map((feature) => (
					<Card size="3" key={feature.title} className={styles.featureCard}>
						<Flex direction="column" gap="2">
							<Heading size="4">
								{feature.title}
								{feature.plusFeature && (
									<Badge
										size="2"
										style={{
											verticalAlign: "middle",
										}}
										ml="2"
									>
										<strong
											style={{
												fontWeight: 900,
												fontStyle: "italic",
											}}
										>
											sill+
										</strong>
									</Badge>
								)}
							</Heading>
							<Text size="2" color="gray">
								{feature.description}
							</Text>
						</Flex>
					</Card>
				))}
			</Grid>
		</Box>
	);
};

export default Features;
