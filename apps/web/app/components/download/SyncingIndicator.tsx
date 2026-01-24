import { Callout, Spinner } from "@radix-ui/themes";
import { CheckCircle2, CircleAlert } from "lucide-react";

interface SyncingIndicatorProps {
	service?: string | null;
	status: "syncing" | "success" | "error";
}

export default function SyncingIndicator({
	service,
	status,
}: SyncingIndicatorProps) {
	if (status === "success") {
		return (
			<Callout.Root color="green" mb="4">
				<Callout.Icon>
					<CheckCircle2 width="18" height="18" />
				</Callout.Icon>
				<Callout.Text>
					Your {service || "social media"} timeline has been synced.
				</Callout.Text>
			</Callout.Root>
		);
	}

	if (status === "error") {
		return (
			<Callout.Root color="red" mb="4">
				<Callout.Icon>
					<CircleAlert width="18" height="18" />
				</Callout.Icon>
				<Callout.Text>
					There was an issue syncing your timeline. Your links will sync
					automatically in the background.
				</Callout.Text>
			</Callout.Root>
		);
	}

	return (
		<Callout.Root color="blue" mb="4">
			<Callout.Icon>
				<Spinner size="1" />
			</Callout.Icon>
			<Callout.Text>
				Syncing the last 24 hours from your {service || "social media"} timeline
				in the background. You can start exploring below.
			</Callout.Text>
		</Callout.Root>
	);
}
