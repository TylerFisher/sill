import { Flex, Link, Text } from "@radix-ui/themes";
import type { MostRecentLinkPosts } from "~/utils/links.server";

interface DisplayHostProps {
	link: MostRecentLinkPosts["link"];
	host: string;
	theme: string | undefined;
}

const DisplayHost = ({ link, host, theme }: DisplayHostProps) => {
	if (!link) return null;

	return (
		<Flex align="center" mb="1" mt="3">
			<img
				src={`https://s2.googleusercontent.com/s2/favicons?domain=${host}&sz=32`}
				loading="lazy"
				alt=""
				width="16px"
				height="16px"
				decoding="async"
				style={{
					marginRight: "0.25rem",
					backgroundColor: theme === "dark" ? "white" : "transparent",
				}}
			/>
			<Text size="1" color="gray" as="span">
				<Link href={`/links/domain/${host}`}>{link.siteName || host}</Link>
			</Text>
		</Flex>
	);
};

export default DisplayHost;