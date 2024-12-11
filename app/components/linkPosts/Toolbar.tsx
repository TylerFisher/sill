import { Flex } from "@radix-ui/themes";
import CopyLink from "./CopyLink";
import ShareLink from "./ShareLink";
import OpenLink from "./OpenLink";
import MuteActions from "./MuteActions";

interface ToolbarProps {
	url: string;
	narrowMutePhrase: string;
	broadMutePhrase: string;
	type: "post" | "link";
	instance: string | undefined;
	bsky: string | undefined;
}

const Toolbar = ({
	url,
	narrowMutePhrase,
	broadMutePhrase,
	type,
	instance,
	bsky,
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
			<OpenLink url={url} />
			<MuteActions
				narrowMutePhrase={narrowMutePhrase}
				broadMutePhrase={broadMutePhrase}
				type={type}
			/>
		</Flex>
	);
};

export default Toolbar;
