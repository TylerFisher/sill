import { Flex } from "@radix-ui/themes";
import CopyLink from "./CopyLink";
import ShareLink from "./ShareLink";
import OpenLink from "./OpenLink";
import MuteActions from "./MuteActions";
import BookmarkLink from "./BookmarkLink";
interface ToolbarProps {
	url: string;
	giftUrl?: string | null;
	narrowMutePhrase: string;
	broadMutePhrase: string;
	type: "post" | "link";
	instance: string | undefined;
	bsky: string | undefined;
	isBookmarked: boolean;
}

const Toolbar = ({
	url,
	giftUrl,
	narrowMutePhrase,
	broadMutePhrase,
	type,
	instance,
	bsky,
	isBookmarked = false,
}: ToolbarProps) => {
	return (
		<Flex justify="between" mx="1" mt="4">
			<ShareLink url={url} instance={instance} bsky={bsky} />
			<CopyLink
				url={url}
				textPositioning={{
					position: "absolute",
					top: "-3.5px",
					left: "1.8em",
				}}
			/>
			{type === "link" && (
				<BookmarkLink url={url} isBookmarked={isBookmarked} />
			)}
			<OpenLink url={giftUrl || url} isGift={!!giftUrl} />
			<MuteActions
				narrowMutePhrase={narrowMutePhrase}
				broadMutePhrase={broadMutePhrase}
				type={type}
			/>
		</Flex>
	);
};

export default Toolbar;
