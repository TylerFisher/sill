import { Link, IconButton } from "@radix-ui/themes";
import { ExternalLink, Gift } from "lucide-react";

const OpenLink = ({ url, isGift }: { url: string; isGift: boolean }) => {
	const label = isGift ? "Open gift link" : "Open in new tab";
	return (
		<Link
			href={url}
			target="_blank"
			rel="noreferrer"
			aria-label={label}
			title={label}
		>
			<IconButton
				aria-label={label}
				title={label}
				variant="ghost"
				size="1"
				style={{
					position: "relative",
					top: isGift ? "-1px" : "0",
				}}
			>
				{isGift ? (
					<Gift width="20" height="20" />
				) : (
					<ExternalLink width="18" height="18" />
				)}
			</IconButton>
		</Link>
	);
};

export default OpenLink;
