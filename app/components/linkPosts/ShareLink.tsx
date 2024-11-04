import { Link, IconButton } from "@radix-ui/themes";
import ShareOpenly from "../icons/ShareOpenly";

const ShareLink = ({ url }: { url: string }) => {
	return (
		<Link
			href={`https://shareopenly.org/share/?url=${url}`}
			target="_blank"
			rel="noreferrer"
			aria-label="Share with ShareOpenly"
		>
			<IconButton aria-label="Share with ShareOpenly" variant="ghost" size="1">
				<ShareOpenly />
			</IconButton>
		</Link>
	);
};

export default ShareLink;
