import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";

interface PageHeadingProps {
	title: string;
	dek?: string;
	// A primary action (e.g. a button) pinned to the right of the title.
	action?: ReactNode;
}

const PageHeading = ({ title, dek, action }: PageHeadingProps) => {
	return (
		<Box mb="4">
			<Flex justify="between" align="center" gap="4" mb="4">
				<Heading as="h2" size="6">
					{title}
				</Heading>
				{action && <Box style={{ flexShrink: 0 }}>{action}</Box>}
			</Flex>
			{dek && <Text>{dek}</Text>}
		</Box>
	);
};

export default PageHeading;
