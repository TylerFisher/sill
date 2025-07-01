import { AspectRatio, Flex, Inset, Link, Text } from "@radix-ui/themes";
import type { MostRecentLinkPosts } from "~/utils/links.server";
import styles from "../LinkRep.module.css";

interface LinkImageProps {
	link: MostRecentLinkPosts["link"];
	url: URL;
	host: string;
	displayHost: string;
	displayTitle: string;
	layout: "dense" | "default";
	theme: string | undefined;
}

const LinkImage = ({
	link,
	url,
	host,
	displayHost,
	displayTitle,
	layout,
	theme,
}: LinkImageProps) => {
	if (!link) return null;
	const shouldShowMainImage =
		link.imageUrl &&
		layout === "default" &&
		url.hostname !== "www.youtube.com" &&
		url.hostname !== "youtu.be" &&
		url.hostname !== "twitter.com";
	const validMetadata = link.metadata?.ogUrl ? link.metadata : null;
	const displayImage = (() => {
		if (!validMetadata?.ogImage) return link.imageUrl || null;
		if (Array.isArray(validMetadata.ogImage)) {
			return validMetadata.ogImage[0]?.url || link.imageUrl || null;
		}
		// Handle case where ogImage is an object with url property
		const ogImageObj = validMetadata.ogImage as { url?: string };
		return ogImageObj?.url || link.imageUrl || null;
	})();

	return (
		<>
			{shouldShowMainImage && (
				<Inset mb="4" className={styles.inset}>
					<AspectRatio ratio={16 / 9}>
						<Link
							target="_blank"
							rel="noreferrer"
							href={link.url}
							aria-label={displayTitle}
						>
							<img
								src={displayImage || ""}
								loading="lazy"
								alt=""
								decoding="async"
								width="100%"
								height="100%"
								className={styles["link-image"]}
							/>
						</Link>
					</AspectRatio>
				</Inset>
			)}
			{layout === "default" && (
				<Flex align="center" mb="1" mt={shouldShowMainImage ? "3" : "0"}>
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
						{displayHost}
					</Text>
				</Flex>
			)}
		</>
	);
};

export default LinkImage;
