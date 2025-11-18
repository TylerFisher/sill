import { Callout, Text } from "@radix-ui/themes";
import { Sparkles } from "lucide-react";

export default function WelcomeTrialBanner() {
	return (
		<Callout.Root mb="6" size="3">
			<Callout.Icon>
				<Sparkles />
			</Callout.Icon>
			<Callout.Text>
				<Text weight="bold">
					Free{" "}
					<Text style={{ fontWeight: 900, fontStyle: "italic" }}>sill+</Text>{" "}
					trial active
				</Text>
			</Callout.Text>
		</Callout.Root>
	);
}
