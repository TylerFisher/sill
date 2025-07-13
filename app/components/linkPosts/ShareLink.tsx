import { Button, Flex, IconButton, Link, Popover } from "@radix-ui/themes";
import { Share } from "lucide-react";

const SingleAccountShare = ({
	url,
	instance,
	layout,
}: {
	url: string;
	instance: string | undefined;
	layout: "default" | "dense";
}) => {
	const link = instance
		? `https://${instance}/share?text=${encodeURIComponent(url)}`
		: `https://bsky.app/intent/compose?text=${encodeURIComponent(url)}`;
	return (
		<Link href={link} target="_blank" rel="noreferrer" aria-label="Share">
			<IconButton aria-label="Share" variant="ghost" title="Share">
				<Share
					width={layout === "default" ? "18" : "14"}
					height={layout === "default" ? "18" : "14"}
				/>
			</IconButton>
		</Link>
	);
};

const ShareLink = ({
	url,
	instance,
	bsky,
	layout,
}: {
	url: string;
	instance: string | undefined;
	bsky: string | undefined;
	layout: "default" | "dense";
}) => {
	if (instance && bsky) {
		return (
			<Popover.Root>
				<Popover.Trigger aria-label="Share" title="Share">
					<IconButton aria-label="Share" variant="ghost" title="Share">
						<Share
							width={layout === "default" ? "18" : "14"}
							height={layout === "default" ? "18" : "14"}
						/>
					</IconButton>
				</Popover.Trigger>
				<Popover.Content>
					<Flex direction="column" gap="2">
						{bsky && (
							<Link
								href={`https://bsky.app/intent/compose?text=${encodeURIComponent(url)}`}
								target="_blank"
								rel="noreferrer"
								aria-label="Share on Bluesky"
							>
								<Button
									style={{
										width: "100%",
									}}
								>
									Share on Bluesky
								</Button>
							</Link>
						)}
						{instance && (
							<Link
								href={`https://${instance}/share?text=${encodeURIComponent(url)}`}
								target="_blank"
								rel="noreferrer"
								aria-label="Share on Mastodon"
							>
								<Button
									style={{
										width: "100%",
									}}
								>
									Share on Mastodon
								</Button>
							</Link>
						)}
					</Flex>
				</Popover.Content>
			</Popover.Root>
		);
	}

	return <SingleAccountShare url={url} instance={instance} layout={layout} />;
};

export default ShareLink;
