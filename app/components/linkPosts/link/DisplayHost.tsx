import { Flex, Link, Text } from "@radix-ui/themes";
import type { MostRecentLinkPosts } from "~/utils/links.server";

interface DisplayHostProps {
	link: MostRecentLinkPosts["link"];
	host: string;
	theme: string | undefined;
	image: boolean;
}

const DisplayHost = ({ link, host, theme, image }: DisplayHostProps) => {
	if (!link) return null;

	return (
		<Flex
			align="center"
			mb="2"
			mt={image ? "-5" : "0"}
			ml="-4"
			style={{
				backgroundColor: "var(--color-panel-solid)",
				padding: "0.33rem 1rem",
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
					display: "block",
				}}
			/>
			<Text size="1" color="gray" as="span" style={{ lineHeight: "16px" }}>
				{/* <Link
					href={`/links/domain/${host}`}
					style={{ lineHeight: "16px" }}
					color="gray"
				> */}
				{link.siteName || host}
				{/* </Link> */}
			</Text>
		</Flex>
	);
};

export default DisplayHost;
