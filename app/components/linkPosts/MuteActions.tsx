import { Popover, IconButton, Flex, Button } from "@radix-ui/themes";
import { useFetcher } from "react-router";
import { MessageSquareOff } from "lucide-react";

const MuteActions = ({
	narrowMutePhrase,
	broadMutePhrase,
	type,
}: {
	narrowMutePhrase: string;
	broadMutePhrase: string;
	type: "post" | "link";
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
					<MessageSquareOff width="18" height="18" />
				</IconButton>
			</Popover.Trigger>
			<Popover.Content>
				<Flex gap="4" direction="column">
					<fetcher.Form method="POST" action="/moderation">
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
					<fetcher.Form method="POST" action="/moderation">
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
