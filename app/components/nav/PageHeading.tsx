import { Box, Heading, Text } from "@radix-ui/themes";

interface PageHeadingProps {
	title: string;
	dek: string;
}

const PageHeading = ({ title, dek }: PageHeadingProps) => {
	return (
		<Box mb="4">
			<Heading as="h2" size="6" mb="4">
				{title}
			</Heading>
			<Text>{dek}</Text>
		</Box>
	);
};

export default PageHeading;
