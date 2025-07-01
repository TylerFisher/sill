import * as ReactTweet from "react-tweet";
import { ClientOnly } from "remix-utils/client-only";

const { Tweet } = ReactTweet;

interface XEmbedProps {
	url: URL;
}

const XEmbed = ({ url }: XEmbedProps) => {
	const adjusted = url.href.split("/photo/")[0];
	return (
		<ClientOnly>
			{() => <Tweet id={adjusted.split("/").pop() || ""} />}
		</ClientOnly>
	);
};

export default XEmbed;