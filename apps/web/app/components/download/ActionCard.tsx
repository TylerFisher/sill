import { Button, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { NavLink } from "react-router";

interface ActionCardProps {
	title: string;
	description: string;
	buttonText: string;
	buttonTo: string;
	buttonVariant?: "solid" | "outline";
}

export default function ActionCard({
	title,
	description,
	buttonText,
	buttonTo,
	buttonVariant = "outline",
}: ActionCardProps) {
	return (
		<Card size="3" style={{ height: "100%" }}>
			<Flex direction="column" gap="3" style={{ height: "100%" }}>
				<Heading as="h3" size="5">
					{title}
				</Heading>
				<Text color="gray" size="3" style={{ flexGrow: 1 }}>
					{description}
				</Text>
				<Button asChild size="3" variant={buttonVariant}>
					<NavLink to={buttonTo}>{buttonText}</NavLink>
				</Button>
			</Flex>
		</Card>
	);
}
