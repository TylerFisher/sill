import { DropdownMenu, Flex, IconButton, Link } from "@radix-ui/themes";
import type { SerializeFrom } from "@vercel/remix";
import type { MostRecentLinkPosts } from "~/utils/links.server";
import { Ellipsis, Copy, ExternalLink, Share } from "lucide-react";
import { useFetcher } from "@remix-run/react";
import CopyToClipboard from "react-copy-to-clipboard";

interface PostToolbarProps {
	post: SerializeFrom<MostRecentLinkPosts["post"]>;
}

const PostToolbar = ({ post }: PostToolbarProps) => {
	const fetcher = useFetcher();

	return (
		<Flex justify="between" mr="2">
			<Link
				href={`https://shareopenly.org/share/?url=${post.url}`}
				target="_blank"
				rel="noreferrer"
				aria-label="Share with ShareOpenly"
			>
				<IconButton
					aria-label="Share with ShareOpenly"
					variant="ghost"
					size="1"
				>
					<Share width="18" height="18" />
				</IconButton>
			</Link>
			<IconButton aria-label="Copy URL" variant="ghost" size="1">
				<CopyToClipboard text={post.url}>
					<Copy width="18" height="18" />
				</CopyToClipboard>
			</IconButton>
			<Link
				href={post.url}
				target="_blank"
				rel="noreferrer"
				aria-label="Open in new tab"
			>
				<IconButton aria-label="Open in new tab" variant="ghost" size="1">
					<ExternalLink width="18" height="18" />
				</IconButton>
			</Link>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					<IconButton aria-label="More options" variant="ghost" size="1">
						<Ellipsis width="18" height="18" />
					</IconButton>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Item>
						<fetcher.Form method="POST" action="/moderation">
							<input type="hidden" name="newPhrase" value={post.actorHandle} />
							<button
								type="submit"
								style={{
									all: "unset",
								}}
							>
								Mute {post.actorHandle}
							</button>
						</fetcher.Form>
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</Flex>
	);
};

export default PostToolbar;
