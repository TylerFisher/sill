import { Link, IconButton } from "@radix-ui/themes";
import { ExternalLink } from "lucide-react";

const OpenLink = ({ url }: { url: string }) => {
	return (
		<Link
			href={url}
			target="_blank"
			rel="noreferrer"
			aria-label="Open in new tab"
			title="Open in new tab"
		>
			<IconButton aria-label="Open in new tab" variant="ghost" size="1">
				<ExternalLink width="18" height="18" />
			</IconButton>
		</Link>
	);
};

export default OpenLink;
