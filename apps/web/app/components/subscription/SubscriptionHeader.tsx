import { Box, Text } from "@radix-ui/themes";
import SillPlus from "./SillPlus";

export default function SubscriptionHeader() {
	return (
		<Box mb="6">
			<Text
				as="p"
				size={{
					initial: "6",
					md: "7",
				}}
				weight="bold"
				color="yellow"
			>
				Support Sill with <SillPlus />.
			</Text>
			<Text
				as="p"
				size="3"
				color="gray"
				style={{ maxWidth: "520px", marginTop: "var(--space-3)" }}
			>
				Sill is independent software, kept running by the people who use it.
				Pay what you want to keep it online and improving. More for supporters
				is on the way.
			</Text>
		</Box>
	);
}
