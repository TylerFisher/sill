import { AspectRatio, Inset, Link } from "@radix-ui/themes";
import type { MostRecentLinkPosts } from "~/utils/links.server";
import styles from "../LinkRep.module.css";

interface LinkImageProps {
	link: MostRecentLinkPosts["link"];
	url: URL;
	layout: "dense" | "default";
}

const LinkImage = ({ link, url, layout }: LinkImageProps) => {
	if (!link) return null;
	const shouldShowMainImage =
		link.imageUrl &&
		layout === "default" &&
		url.hostname !== "www.youtube.com" &&
		url.hostname !== "youtu.be" &&
		url.hostname !== "twitter.com";

	return (
		<>
			{shouldShowMainImage && (
				<Inset mb="2" className={styles.inset}>
					<AspectRatio ratio={2 / 1}>
						<Link
							target="_blank"
							rel="noreferrer"
							href={link.url}
							aria-label={link.title}
						>
							<img
								src={link.imageUrl || ""}
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
		</>
	);
};

export default LinkImage;
