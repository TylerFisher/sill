import { Box } from "@radix-ui/themes";
import Youtube from "react-youtube";
import { ClientOnly } from "remix-utils/client-only";

interface YoutubeEmbedProps {
	url: URL;
}

const YoutubeEmbed = ({ url }: YoutubeEmbedProps) => {
	const id = url.searchParams.get("v") || url.pathname.split("/").pop();
	const opts = {
		width: "100%",
	};
	return (
		<Box mb="5" width="100%">
			<ClientOnly>{() => <Youtube videoId={id} opts={opts} />}</ClientOnly>
		</Box>
	);
};

export default YoutubeEmbed;