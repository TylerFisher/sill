import { Box, Text } from "@radix-ui/themes";

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
				Support Sill with{" "}
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
			<Text
				as="p"
				size="3"
				color="gray"
				align="center"
				style={{ maxWidth: "520px", margin: "var(--space-3) auto 0" }}
			>
				sill+ is a pay-what-you-want way to support the project and get the iOS
				app early. More for supporters may follow.
			</Text>
		</Box>
	);
}
