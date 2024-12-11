import { Box, IconButton, Text } from "@radix-ui/themes";
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";

const CopyLink = ({
	url,
	textPositioning,
}: { url: string; textPositioning: object }) => {
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
		<Box position="relative">
			<CopyToClipboard text={url} onCopy={() => setCopied(true)}>
				<IconButton
					aria-label="Copy URL"
					variant="ghost"
					size="1"
					title="Copy URL"
				>
					{copied ? (
						<Check width="18" height="18" />
					) : (
						<Copy width="18" height="18" />
					)}
				</IconButton>
			</CopyToClipboard>
			{copied && <Text style={textPositioning}>Copied!</Text>}
		</Box>
	);
};

export default CopyLink;
