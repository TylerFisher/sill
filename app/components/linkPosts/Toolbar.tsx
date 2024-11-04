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
}

const Toolbar = ({
	url,
	narrowMutePhrase,
	broadMutePhrase,
	type,
}: ToolbarProps) => {
	return (
		<Flex justify="between" mx="1">
			<ShareLink url={url} />
			<CopyLink url={url} />
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
