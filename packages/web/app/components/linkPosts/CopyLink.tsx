import { Box, IconButton, Text } from "@radix-ui/themes";
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";

const CopyLink = ({
	url,
	textPositioning,
	layout,
}: { url: string; textPositioning: object; layout: "default" | "dense" }) => {
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
					type="button"
					color="gray"
				>
					{copied ? (
						<Check
							width={layout === "default" ? "18" : "14"}
							height={layout === "default" ? "18" : "14"}
						/>
					) : (
						<Copy
							width={layout === "default" ? "18" : "14"}
							height={layout === "default" ? "18" : "14"}
						/>
					)}
				</IconButton>
			</CopyToClipboard>
			{copied && <Text style={textPositioning}>Copied!</Text>}
		</Box>
	);
};

export default CopyLink;
