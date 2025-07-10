import { Callout, Link, Text } from "@radix-ui/themes";
import { Sparkles } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";

interface SubscriptionCalloutProps
	extends ComponentPropsWithoutRef<typeof Callout.Root> {
	featureName: string;
}

const SubscriptionCallout = ({
	featureName,
	color = "yellow",
	...calloutProps
}: SubscriptionCalloutProps) => {
	return (
		<Callout.Root color={color} mb="4" {...calloutProps}>
			<Callout.Icon>
				<Sparkles width="18" height="18" />
			</Callout.Icon>
			<Callout.Text>
				{featureName} are part of{" "}
				<Text
					color={color}
					style={{
						fontWeight: 900,
						fontStyle: "italic",
					}}
				>
					sill+
				</Text>
				. <Link href="/settings/subscription">Subscribe now</Link> to maintain
				access.
			</Callout.Text>
		</Callout.Root>
	);
};

export default SubscriptionCallout;
