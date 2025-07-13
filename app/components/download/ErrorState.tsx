import { Box, Text } from "@radix-ui/themes";

export default function ErrorState() {
	return (
		<Box>
			<Text as="p" mb="4">
				Failed to download your timeline. Please refresh the page to try again.
			</Text>
		</Box>
	);
}
