import {
	Box,
	Button,
	DropdownMenu,
	IconButton,
	Link,
	Text,
} from "@radix-ui/themes";
import { Ellipsis } from "lucide-react";
import CopyToClipboard from "react-copy-to-clipboard";
import { useFetcher } from "react-router";
import type { SubscriptionStatus } from "@sill/schema";
import styles from "./ToolDropdown.module.css";

interface ToolDropdownProps {
	url: string;
	giftUrl?: string | null;
	instance: string | undefined;
	bsky: string | undefined;
	narrowMutePhrase: string;
	broadMutePhrase: string;
	isBookmarked: boolean;
	subscribed?: SubscriptionStatus;
}

const ToolDropdown = ({
	url,
	giftUrl,
	bsky,
	instance,
	narrowMutePhrase,
	broadMutePhrase,
	isBookmarked = false,
	subscribed,
}: ToolDropdownProps) => {
	const fetcher = useFetcher();

	return (
		<Box position="absolute" bottom="2" right="3">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					<IconButton variant="ghost" color="gray">
						<Ellipsis width={16} height={16} />
					</IconButton>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Item>
						<CopyToClipboard text={url}>
							<Text>Copy</Text>
						</CopyToClipboard>
					</DropdownMenu.Item>
					{subscribed !== "free" && (
						<fetcher.Form
							method={isBookmarked ? "DELETE" : "POST"}
							action={isBookmarked ? "/bookmarks/delete" : "/bookmarks/add"}
						>
							<input type="hidden" name="url" value={url} />
							<DropdownMenu.Item>
								<Button
									type="submit"
									className={styles.submitButtonDropdown}
									variant="ghost"
									style={{
										paddingLeft: "0.33rem",
									}}
								>
									{isBookmarked ? "Unbookmark" : "Bookmark"}
								</Button>
							</DropdownMenu.Item>
						</fetcher.Form>
					)}

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
							<fetcher.Form method="POST" action="/api/mute/add">
								<input
									type="hidden"
									name="newPhrase"
									value={narrowMutePhrase}
								/>
								<DropdownMenu.Item>
									<Button
										type="submit"
										variant="ghost"
										className={styles.submitButtonDropdown}
									>
										Mute this link
									</Button>
								</DropdownMenu.Item>
							</fetcher.Form>
							<fetcher.Form method="POST" action="/api/mute/add">
								<DropdownMenu.Item>
									<input
										type="hidden"
										name="newPhrase"
										value={broadMutePhrase}
									/>
									<Button
										type="submit"
										className={styles.submitButtonDropdown}
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
