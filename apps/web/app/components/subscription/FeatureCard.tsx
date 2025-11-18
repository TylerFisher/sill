import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import type { ReactElement } from "react";
import styles from "./FeatureCard.module.css";

interface FeatureCardProps {
	icon: ReactElement;
	title: string;
	description: string;
	benefit: string;
	url?: string;
}

export default function FeatureCard({
	icon,
	title,
	description,
	benefit,
	url,
}: FeatureCardProps) {
	const content = (
		<Box
			p="4"
			height="100%"
			style={{
				border: "1px solid var(--gray-6)",
				borderRadius: "var(--radius-3)",
				transition: "all 0.2s ease",
			}}
			className={styles.featureCard}
		>
			<Flex direction="column" gap="3" height="100%" justify="between">
				<Flex direction="column" gap="3">
					<Flex align="center" gap="3">
						<Box style={{ color: "var(--accent-11)" }}>{icon}</Box>
						<Heading as="h3" size="4">
							{title}
						</Heading>
					</Flex>
					<Text as="p" size="3" color="gray">
						{description}
					</Text>
				</Flex>
				<Text as="p" size="2" color="yellow">
					{benefit}
				</Text>
			</Flex>
		</Box>
	);

	if (url) {
		return (
			<a
				href={url}
				target="_blank"
				rel="noopener noreferrer"
				className={styles.featureCardLink}
			>
				{content}
			</a>
		);
	}

	return content;
}
