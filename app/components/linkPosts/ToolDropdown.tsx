import {
	Box,
	DropdownMenu,
	Text,
	Link,
	IconButton,
	Button,
} from "@radix-ui/themes";
import CopyToClipboard from "react-copy-to-clipboard";
import { Ellipsis } from "lucide-react";
import { useFetcher } from "react-router";

interface ToolDropdownProps {
	url: string;
	giftUrl?: string | null;
	instance: string | undefined;
	bsky: string | undefined;
	narrowMutePhrase: string;
	broadMutePhrase: string;
	isBookmarked: boolean;
}

const ToolDropdown = ({
	url,
	giftUrl,
	bsky,
	instance,
	narrowMutePhrase,
	broadMutePhrase,
	isBookmarked = false,
}: ToolDropdownProps) => {
	const fetcher = useFetcher();

	return (
		<Box position="absolute" bottom="2" right="3">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					<IconButton variant="ghost">
						<Ellipsis width={16} height={16} />
					</IconButton>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Item>
						<CopyToClipboard text={url}>
							<Text>Copy</Text>
						</CopyToClipboard>
					</DropdownMenu.Item>
					<fetcher.Form
						method={isBookmarked ? "DELETE" : "POST"}
						action={isBookmarked ? "/bookmarks/delete" : "/bookmarks/add"}
					>
						<input type="hidden" name="url" value={url} />
						<DropdownMenu.Item>
							<Button
								type="submit"
								style={{
									width: "100%",
									color: "black",
									textAlign: "left",
									paddingLeft: "0.33rem",
								}}
								variant="ghost"
							>
								{isBookmarked ? "Unbookmark" : "Bookmark"}
							</Button>
						</DropdownMenu.Item>
					</fetcher.Form>

					{giftUrl && (
						<DropdownMenu.Item>
							<Link
								href={giftUrl}
								target="_blank"
								rel="noreferrer"
								color="gray"
								highContrast
								underline="none"
							>
								Open gift link
							</Link>
						</DropdownMenu.Item>
					)}

					<DropdownMenu.Sub>
						<DropdownMenu.SubTrigger>Share</DropdownMenu.SubTrigger>
						<DropdownMenu.SubContent>
							<DropdownMenu.Item>
								{bsky && (
									<Link
										href={`https://bsky.app/intent/compose?text=${encodeURIComponent(url)}`}
										target="_blank"
										rel="noreferrer"
										aria-label="Share on Bluesky"
										color="gray"
										highContrast
										underline="none"
									>
										Share on Bluesky
									</Link>
								)}
							</DropdownMenu.Item>
							<DropdownMenu.Item>
								{instance && (
									<Link
										href={`https://${instance}/share?text=${encodeURIComponent(url)}`}
										target="_blank"
										rel="noreferrer"
										aria-label="Share on Mastodon"
										color="gray"
										highContrast
										underline="none"
									>
										Share on Mastodon
									</Link>
								)}
							</DropdownMenu.Item>
						</DropdownMenu.SubContent>
					</DropdownMenu.Sub>
					<DropdownMenu.Sub>
						<DropdownMenu.SubTrigger>Mute</DropdownMenu.SubTrigger>
						<DropdownMenu.SubContent>
							<fetcher.Form method="POST" action="/moderation">
								<input
									type="hidden"
									name="newPhrase"
									value={narrowMutePhrase}
								/>
								<DropdownMenu.Item>
									<Button
										type="submit"
										variant="ghost"
										style={{ width: "100%", color: "black" }}
									>
										Mute this link
									</Button>
								</DropdownMenu.Item>
							</fetcher.Form>
							<fetcher.Form method="POST" action="/moderation">
								<DropdownMenu.Item>
									<input
										type="hidden"
										name="newPhrase"
										value={broadMutePhrase}
									/>
									<Button
										type="submit"
										style={{
											width: "100%",
											color: "black",
										}}
										variant="ghost"
									>
										Mute all links from {broadMutePhrase}
									</Button>
								</DropdownMenu.Item>
							</fetcher.Form>
						</DropdownMenu.SubContent>
					</DropdownMenu.Sub>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</Box>
	);
};

export default ToolDropdown;
