import { IconButton, Link } from "@radix-ui/themes";
import { ExternalLink, Gift } from "lucide-react";

const OpenLink = ({
	url,
	isGift,
	layout,
}: { url: string; isGift: boolean; layout: "default" | "dense" }) => {
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
				color="gray"
			>
				{isGift ? (
					<Gift
						width={layout === "default" ? "20" : "16"}
						height={layout === "default" ? "20" : "16"}
					/>
				) : (
					<ExternalLink
						width={layout === "default" ? "18" : "14"}
						height={layout === "default" ? "18" : "14"}
					/>
				)}
			</IconButton>
		</Link>
	);
};

export default OpenLink;
