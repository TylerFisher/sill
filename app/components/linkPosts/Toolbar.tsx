import {
	Box,
	Button,
	Flex,
	IconButton,
	Link,
	Popover,
	Text,
} from "@radix-ui/themes";
import { useFetcher } from "@remix-run/react";
import { Check, Copy, ExternalLink, MessageSquareOff } from "lucide-react";
import { useEffect, useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import ShareOpenly from "../icons/ShareOpenly";

interface ToolbarProps {
	url: string;
	narrowMutePhrase: string;
	broadMutePhrase: string;
	type: "post" | "link";
}

const Toolbar = ({
	url,
	narrowMutePhrase,
	broadMutePhrase,
	type,
}: ToolbarProps) => {
	const fetcher = useFetcher();
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (copied) {
			const timeout = setTimeout(() => {
				setCopied(false);
			}, 2000);
			return () => clearTimeout(timeout);
		}
	}, [copied]);

	return (
		<Flex justify="between" mr="2">
			<Link
				href={`https://shareopenly.org/share/?url=${url}`}
				target="_blank"
				rel="noreferrer"
				aria-label="Share with ShareOpenly"
			>
				<IconButton
					aria-label="Share with ShareOpenly"
					variant="ghost"
					size="1"
				>
					<ShareOpenly />
				</IconButton>
			</Link>
			<Box position="relative">
				<IconButton aria-label="Copy URL" variant="ghost" size="1">
					<CopyToClipboard text={url} onCopy={() => setCopied(true)}>
						{copied ? (
							<Check width="18" height="18" />
						) : (
							<Copy width="18" height="18" />
						)}
					</CopyToClipboard>
				</IconButton>
				{copied && (
					<Text
						style={{
							position: "absolute",
							top: "-3.5px",
							left: "1.8em",
						}}
					>
						Copied!
					</Text>
				)}
			</Box>

			<Link
				href={url}
				target="_blank"
				rel="noreferrer"
				aria-label="Open in new tab"
			>
				<IconButton aria-label="Open in new tab" variant="ghost" size="1">
					<ExternalLink width="18" height="18" />
				</IconButton>
			</Link>
			<Popover.Root>
				<Popover.Trigger>
					<IconButton aria-label="More options" variant="ghost" size="1">
						<MessageSquareOff width="18" height="18" />
					</IconButton>
				</Popover.Trigger>
				<Popover.Content>
					<Flex
						gap="4"
						direction={{
							initial: "column",
							sm: "row",
						}}
					>
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
		</Flex>
	);
};

export default Toolbar;
