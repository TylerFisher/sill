import { Box, Heading, Text } from "@radix-ui/themes";

export default function SubscriptionHeader() {
	return (
		<Box mb="6" style={{ textAlign: "center" }}>
			<Text
				as="p"
				size={{
					initial: "6",
					md: "7",
				}}
				align="center"
				weight="bold"
				color="yellow"
				style={{ maxWidth: "600px", margin: "0 auto" }}
			>
				Stop doomscrolling. Get{" "}
				<Text
					color="yellow"
					style={{
						fontWeight: 900,
						fontStyle: "italic",
					}}
				>
					sill+
				</Text>
				.
			</Text>
		</Box>
	);
}
