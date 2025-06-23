// app/components/marketing/Features.tsx
import {
	Badge,
	Box,
	Card,
	Flex,
	Grid,
	Heading,
	Link,
	Text,
} from "@radix-ui/themes";
import styles from "./Features.module.css";

const features = [
	{
		title: "Smart Link Aggregation",
		description:
			"Automatically collect and rank links shared across your social networks based on popularity within your trusted circle.",
		cta: "Learn how Sill works",
		ctaUrl: "https://docs.sill.social/how-sill-works/",
	},
	{
		title: "Trending Links",
		description:
			"See what's trending across the open social web in real-time. Open to everyone, not just people with Sill accounts.",
		cta: "Explore trending links",
		ctaUrl: "https://sill.social/links/trending",
	},
	{
		title: "Bookmarks",
		description:
			"Save links to your bookmarks for easy access and organization.",
		cta: "Learn more about bookmarks",
		ctaUrl: "https://docs.sill.social/sill-plus/bookmarks/",
		plus: true,
	},
	{
		title: "Custom Lists & Feeds",
		description:
			"Track links from your favorite custom lists and feeds on Bluesky or Mastodon.",
		cta: "Learn more about custom lists",
		ctaUrl: "https://docs.sill.social/sill-plus/lists/",
		plus: true,
	},
	{
		title: "Daily Digest",
		description:
			"Get a daily curated email or RSS feed of the most popular links from your network, delivered at your preferred time.",
		cta: "Learn more about the Daily Digest",
		ctaUrl: "https://docs.sill.social/sill-plus/daily-digest/",
		plus: true,
	},
	{
		title: "Custom Notifications",
		description:
			"Set up personalized email or RSS alerts for any criteria you define, from popularity thresholds to specific keywords.",
		cta: "Learn more about custom notifications",
		ctaUrl: "https://docs.sill.social/sill-plus/notifications/",
		plus: true,
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
							<Flex align="center" gap="2">
								<Heading size="4">{feature.title}</Heading>
								{feature.plus && (
									<Badge color="yellow" variant="solid" size="1">
										<Text
											style={{
												fontStyle: "italic",
												fontWeight: "900",
												color: "#9E6C00",
											}}
										>
											sill+
										</Text>
									</Badge>
								)}
							</Flex>
							<Text size="2" color="gray">
								{feature.description}
							</Text>
							<Text size="2">
								<Link href={feature.ctaUrl}>{feature.cta}</Link>
							</Text>
						</Flex>
					</Card>
				))}
			</Grid>
		</Box>
	);
};

export default Features;
