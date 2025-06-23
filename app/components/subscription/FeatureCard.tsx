import { Box, Card, Flex, Heading, Text } from "@radix-ui/themes";

interface FeatureCardProps {
	icon: string;
	title: string;
	description: string;
	benefit: string;
}

export default function FeatureCard({
	icon,
	title,
	description,
	benefit,
}: FeatureCardProps) {
	return (
		<Card style={{ background: "var(--accent-2)" }}>
			<Box p="5">
				<Flex align="center" gap="3" mb="3">
					<Box
						style={{
							background: "var(--accent-9)",
							borderRadius: "50%",
							width: "40px",
							height: "40px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<Text size="6">{icon}</Text>
					</Box>
					<Heading as="h3" size="5" color="yellow">
						{title}
					</Heading>
				</Flex>
				<Text as="p" size="4" mb="3">
					{description}
				</Text>
				<Text as="p" size="3" color="gray" weight="medium">
					{benefit}
				</Text>
			</Box>
		</Card>
	);
}