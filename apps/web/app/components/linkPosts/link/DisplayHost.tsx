import { Flex, Link, Text } from "@radix-ui/themes";
import type { MostRecentLinkPosts } from "@sill/schema";
import { useSearchParams } from "react-router";
import { discoveryHref } from "~/utils/discoveryFilters";

interface DisplayHostProps {
	link: MostRecentLinkPosts["link"];
	host: string;
	theme: string | undefined;
	image: boolean;
}

const DisplayHost = ({ link, host, theme, image }: DisplayHostProps) => {
	const [searchParams] = useSearchParams();
	if (!link) return null;

	const time = searchParams.get("time");

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
				position: "relative",
				top: "-2.2px",
			}}
		>
			<img
				src={
					link.publisherIcon ||
					`https://s2.googleusercontent.com/s2/favicons?domain=${host}&sz=32`
				}
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
				<Link
					href={discoveryHref(`/links/domain/${host}`, time)}
					style={{ lineHeight: "16px" }}
					color="gray"
				>
					{link.siteName || host}
				</Link>
			</Text>
		</Flex>
	);
};

export default DisplayHost;
