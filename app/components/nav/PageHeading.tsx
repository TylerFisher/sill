import { Box, Heading, Callout } from "@radix-ui/themes";
import { Info } from "lucide-react";

interface PageHeadingProps {
	title: string;
	dek: string;
}

const PageHeading = ({ title, dek }: PageHeadingProps) => {
	return (
		<Box mb="6">
			<Heading as="h2" size="6" mb="4">
				{title}
			</Heading>
			<Callout.Root size="3" variant="outline">
				<Callout.Icon>
					<Info width="18" height="18" />
				</Callout.Icon>
				<Callout.Text>{dek}</Callout.Text>
			</Callout.Root>
		</Box>
	);
};

export default PageHeading;
