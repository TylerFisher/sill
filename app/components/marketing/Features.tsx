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
	{
		title: "Custom Lists & Feeds",
		description: "Track links from your favorite custom lists and feeds.",
		plusFeature: true,
	},
];

const Features = () => {
	return (
		<Box className={styles.features}>
			<Heading size="8" align="center" mb="6">
				Features
			</Heading>

			<Grid columns={{ initial: "1", sm: "2" }} gap="4">
				{features.map((feature) => (
					<Card size="3" key={feature.title} className={styles.featureCard}>
						<Flex direction="column" gap="2">
							<Heading size="4">
								{feature.title}{" "}
								{feature.plusFeature && <Badge size="1">Sill+</Badge>}
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
