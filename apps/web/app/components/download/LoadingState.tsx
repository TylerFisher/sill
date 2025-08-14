import { Box, Spinner, Text } from "@radix-ui/themes";

interface LoadingStateProps {
	service?: string | null;
}

export default function LoadingState({ service }: LoadingStateProps) {
	return (
		<Box>
			<Text as="p" mb="4">
				Downloading the last 24 hours from your {service || "social media"}{" "}
				timeline. This may take a minute.
			</Text>
			<Spinner size="3" />
		</Box>
	);
}
