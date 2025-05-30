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
import type { MostRecentLinkPosts } from "~/utils/links.server";
import { useFetcher } from "react-router";

interface ToolDropdownProps {
	link: MostRecentLinkPosts["link"];
	instance: string | undefined;
	bsky: string | undefined;
	narrowMutePhrase: string;
	broadMutePhrase: string;
}

const ToolDropdown = ({
	link,
	bsky,
	instance,
	narrowMutePhrase,
	broadMutePhrase,
}: ToolDropdownProps) => {
	if (!link) return <div />;

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
						<CopyToClipboard text={link.url}>
							<Text>Copy</Text>
						</CopyToClipboard>
					</DropdownMenu.Item>
					<DropdownMenu.Item>Bookmark</DropdownMenu.Item>
					{link.giftUrl && (
						<DropdownMenu.Item>
							<Link
								href={link.giftUrl}
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
										href={`https://bsky.app/intent/compose?text=${encodeURIComponent(link.url)}`}
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
										href={`https://${instance}/share?text=${encodeURIComponent(link.url)}`}
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
