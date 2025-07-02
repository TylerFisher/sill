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
		<Flex
			align="center"
			mb="2"
			mt="-6"
			ml="-4"
			style={{
				backgroundColor: "var(--color-panel-solid)",
				padding: "0.5rem 1rem",
				width: "fit-content",
				borderTopRightRadius: "var(--radius-4)",
			}}
		>
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
