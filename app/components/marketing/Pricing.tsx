// app/components/marketing/Pricing.tsx
import { Box, Button, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { Link } from "react-router";
import { CheckCircle2 } from "lucide-react";
import styles from "./Pricing.module.css";

interface PricingCardProps {
	title: string;
	price: string;
	features: string[];
	cta: string;
	highlight?: boolean;
}

const PricingCard = ({
	title,
	price,
	features,
	cta,
	highlight,
}: PricingCardProps) => {
	return (
		<Card
			className={
				highlight
					? `${styles.card} ${styles.cardHighlighted}`
					: `${styles.card}`
			}
			size="3"
		>
			<Flex direction="column" gap="4" justify="between" height="100%">
				<Box>
					<Heading size="6" as="h4">
						{title}
					</Heading>
					<Text size="2" weight="bold" color="gray">
						{price}
					</Text>
				</Box>

				<Box>
					<ul className={styles.featureList}>
						{features.map((feature) => (
							<li key={feature}>
								<CheckCircle2 className={styles.checkIcon} />
								{feature}
							</li>
						))}
					</ul>
				</Box>

				<Link to="/accounts/signup">
					<Button
						size="3"
						variant={highlight ? "solid" : "outline"}
						style={{ width: "100%" }}
					>
						{cta}
					</Button>
				</Link>
			</Flex>
		</Card>
	);
};

const cards = [
	{
		title: "Free",
		price: "$0",
		features: [
			"Connect Bluesky and Mastodon",
			"Unlimited access to Sill web interface",
			"Moderation features including mute",
		],
		cta: "Get started",
	},
	{
		title: "sill+",
		price: "$5/month or $50/year",
		features: [
			"All free features",
			"Daily Digest via email or RSS",
			"Custom notifications",
			"Watch custom lists and feeds",
		],
		cta: "Try free for 14 days",
		highlight: true,
	},
];

const Pricing = () => {
	return (
		<Box py="9" maxWidth="800px" mx="auto">
			<Heading size="8" align="center" mb="6">
				Pricing
			</Heading>

			<Flex
				gap="4"
				direction={{ initial: "column", sm: "row" }}
				justify="center"
			>
				{cards.map((card) => (
					<PricingCard key={card.title} {...card} />
				))}
			</Flex>
		</Box>
	);
};

export default Pricing;
