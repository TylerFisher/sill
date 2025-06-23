import { Box, Heading, Text } from "@radix-ui/themes";

export default function SubscriptionHeader() {
	return (
		<Box mb="6" style={{ textAlign: "center" }}>
			<Heading
				as="h2"
				size="9"
				style={{
					fontWeight: 900,
					fontStyle: "italic",
				}}
				align="center"
				color="yellow"
				mb="4"
			>
				sill+
			</Heading>
			<Text
				as="p"
				size="6"
				align="center"
				weight="medium"
				style={{ maxWidth: "600px", margin: "0 auto" }}
			>
				Stop doomscrolling. Let Sill do the work for you.
			</Text>
		</Box>
	);
}
