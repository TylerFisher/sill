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
			style={{
				border: "1px solid var(--gray-6)",
				borderRadius: "var(--radius-3)",
				transition: "all 0.2s ease",
			}}
			className={styles.featureCard}
		>
			<Flex align="start" gap="3" mb="3">
				<Box style={{ minWidth: "2rem", color: "var(--accent-11)" }}>
					{icon}
				</Box>
				<Box>
					<Heading as="h3" size="4" mb="2">
						{title}
					</Heading>
					<Text as="p" size="3" mb="2" color="gray">
						{description}
					</Text>
					<Text as="p" size="2" weight="medium" color="yellow">
						{benefit}
					</Text>
				</Box>
			</Flex>
		</Box>
	);

	if (url) {
		return (
			<a href={url} target="_blank" rel="noopener noreferrer" className={styles.featureCardLink}>
				{content}
			</a>
		);
	}

	return content;
}
