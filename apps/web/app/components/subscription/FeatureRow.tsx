import { Box, Flex, Text } from "@radix-ui/themes";
import type { ReactElement } from "react";
import { Link } from "react-router";

interface FeatureRowProps {
	icon: ReactElement;
	title: string;
	description: string;
	/** Internal route — when set, the whole row is a client-side link. */
	to?: string;
}

/**
 * An icon + label + description row, matching the side nav's icon-and-label
 * pattern (and the subscribe page's benefit list) rather than a bordered card.
 * Used informationally (no `to`) or as a navigable row (`to` set).
 */
export default function FeatureRow({
	icon,
	title,
	description,
	to,
}: FeatureRowProps) {
	const content = (
		<Flex gap="3" align="start">
			<Box mt="1" style={{ color: "var(--accent-11)", flexShrink: 0 }}>
				{icon}
			</Box>
			<Box>
				<Text as="p" size="3" weight="bold">
					{title}
				</Text>
				<Text as="p" size="3" color="gray">
					{description}
				</Text>
			</Box>
		</Flex>
	);

	if (to) {
		return (
			<Link
				to={to}
				style={{ display: "block", color: "inherit", textDecoration: "none" }}
			>
				{content}
			</Link>
		);
	}

	return content;
}
