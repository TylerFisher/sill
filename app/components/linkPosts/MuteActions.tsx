import { Button, Flex, IconButton, Popover } from "@radix-ui/themes";
import { MessageSquareOff } from "lucide-react";
import { useFetcher } from "react-router";

const MuteActions = ({
	narrowMutePhrase,
	broadMutePhrase,
	type,
	layout,
}: {
	narrowMutePhrase: string;
	broadMutePhrase: string;
	type: "post" | "link";
	layout: "default" | "dense";
}) => {
	const fetcher = useFetcher();

	return (
		<Popover.Root>
			<Popover.Trigger>
				<IconButton
					aria-label="Mute options"
					variant="ghost"
					size="1"
					title="Mute options"
				>
					<MessageSquareOff
						width={layout === "default" ? "18" : "14"}
						height={layout === "default" ? "18" : "14"}
					/>
				</IconButton>
			</Popover.Trigger>
			<Popover.Content>
				<Flex gap="4" direction="column">
					<fetcher.Form method="POST" action="/api/mute/add">
						<input type="hidden" name="newPhrase" value={narrowMutePhrase} />
						<Button
							type="submit"
							style={{
								width: "100%",
							}}
						>
							{type === "post" ? "Mute this post" : "Mute this link"}
						</Button>
					</fetcher.Form>
					<fetcher.Form method="POST" action="/api/mute/add">
						<input type="hidden" name="newPhrase" value={broadMutePhrase} />
						<Button
							type="submit"
							style={{
								width: "100%",
							}}
						>
							Mute all {type}s from {broadMutePhrase}
						</Button>
					</fetcher.Form>
				</Flex>
			</Popover.Content>
		</Popover.Root>
	);
};

export default MuteActions;
