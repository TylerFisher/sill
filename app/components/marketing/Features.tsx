// app/components/marketing/Features.tsx
import { Badge, Box, Card, Flex, Grid, Heading, Text } from "@radix-ui/themes";
import { Bell, Mail, Link2, ListTodo } from "lucide-react";
import styles from "./Features.module.css";

const features = [
	{
		icon: <Link2 />,
		title: "Smart Link Aggregation",
		description:
			"Automatically collect and rank links shared across your social networks based on popularity within your trusted circle.",
	},
	{
		icon: <Mail />,
		title: "Daily Digest",
		description:
			"Get a curated email of the most important links from your network, delivered at your preferred time.",
		plusFeature: true,
	},
	{
		icon: <Bell />,
		title: "Custom Notifications",
		description:
			"Set up personalized alerts for specific topics, domains, or when content reaches a certain popularity threshold.",
		plusFeature: true,
	},
	{
		icon: <ListTodo />,
		title: "Custom Lists & Feeds",
		description:
			"Track links from your favorite custom lists and feeds, separate from your main timeline.",
		plusFeature: true,
	},
];

const Features = () => {
	return (
		<Box className={styles.features}>
			<Heading size="8" align="center" mb="6">
				Your social feed, refined
			</Heading>

			<Grid columns={{ initial: "1", sm: "2" }} gap="4">
				{features.map((feature) => (
					<Card key={feature.title} className={styles.featureCard}>
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
