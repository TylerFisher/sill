import { Badge, Button, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { NavLink } from "react-router";
import type { ReactNode } from "react";

interface ActionCardProps {
	title: string;
	description: string;
	buttonText: string;
	buttonTo: string;
	isPremium?: boolean;
	buttonVariant?: "solid" | "outline";
}

export default function ActionCard({
	title,
	description,
	buttonText,
	buttonTo,
	isPremium = false,
	buttonVariant = "outline",
}: ActionCardProps) {
	return (
		<Card size="3" style={{ height: "100%" }}>
			<Flex direction="column" gap="3" style={{ height: "100%" }}>
				<Flex align="center" justify="between">
					<Heading as="h3" size="5">
						{title}
					</Heading>
					{isPremium && (
						<Badge color="yellow" variant="soft">
							<Text style={{ fontWeight: 900, fontStyle: "italic" }}>sill+</Text>
						</Badge>
					)}
				</Flex>
				<Text color="gray" size="3" style={{ flexGrow: 1 }}>
					{description}
				</Text>
				<Button asChild size="3" variant={buttonVariant}>
					<NavLink to={buttonTo}>
						{buttonText}
					</NavLink>
				</Button>
			</Flex>
		</Card>
	);
}