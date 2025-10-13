import { Badge, Flex, HoverCard, Link, Text } from "@radix-ui/themes";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";
import styles from "./LinkMetadata.module.css";
import type { bookmark } from "@sill/schema";
import type { BookmarkWithLinkPosts } from "~/routes/bookmarks";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

const formatTag = (tag: string): string => {
	// If the tag is all lowercase, capitalize the first letter
	if (tag === tag.toLowerCase()) {
		return tag.charAt(0).toUpperCase() + tag.slice(1);
	}
	// Otherwise, return the tag as-is
	return tag;
};

interface LinkMetadataProps {
	authors: string[] | null;
	publishDate: string | null;
	articleTags: string[];
	bookmark: BookmarkWithLinkPosts | undefined;
	url: URL;
	host: string;
	siteName: string | null;
	layout: "default" | "dense";
}

const LinkMetadata = ({
	authors,
	publishDate,
	host,
	siteName,
	layout,
}: LinkMetadataProps) => {
	const displayHost = siteName || host;

	return (
		<>
			{((layout === "dense" && displayHost) || authors || publishDate) && (
				<Text as="p" size="1" color="gray" mt="1">
					{layout === "dense" && (
						<Text>
							{displayHost}
							{displayHost && (authors || publishDate) && (
								<Text as="span" mx="1">
									•
								</Text>
							)}
						</Text>
					)}
					{authors && (
						<>
							by{" "}
							{authors.length === 2 ? (
								authors.map((author, index) => (
									<Text key={author}>
										{/* <Link
											href={`/links/author/${encodeURIComponent(author)}`}
											color="gray"
										> */}
										{author}
										{/* </Link> */}
										{index === 0 && " and "}
									</Text>
								))
							) : authors.length > 2 ? (
								authors.map((author, index) => (
									<Text key={author}>
										{/* <Link
											href={`/links/author/${encodeURIComponent(author)}`}
											color="gray"
										> */}
										{author}
										{/* </Link> */}
										{index < authors.length - 1 &&
											(index === authors.length - 2 ? " and " : ", ")}
									</Text>
								))
							) : (
								// <Link
								// 	href={`/links/author/${encodeURIComponent(authors[0])}`}
								// 	color="gray"
								// >
								// 	{authors[0]}
								// </Link>
								<Text>{authors[0]}</Text>
							)}
						</>
					)}
					{authors && publishDate && <Text mx="1">•</Text>}
					{publishDate && (
						<Text>
							{timeAgo.format(new Date(`${publishDate}`), "round-minute")}
						</Text>
					)}
				</Text>
			)}
		</>
	);
};

export const LinkTags = ({
	articleTags,
	url,
}: {
	articleTags: string[];
	url: URL;
}) => {
	if (articleTags.length === 0) return null;

	return (
		<Flex gap="1" wrap="wrap" mt="3" align="center">
			{articleTags.slice(0, 3).map((tag) => (
				<Link
					key={`${url}-${tag}`}
					href={`/links/topic/${encodeURIComponent(tag)}`}
					className={styles.linkTag}
				>
					<Badge variant="soft" color="gray" size="1">
						{formatTag(tag)}
					</Badge>
				</Link>
			))}
			{articleTags.length > 3 && (
				<span>
					<HoverCard.Root>
						<HoverCard.Trigger>
							<Badge variant="outline" color="gray" size="1">
								+{articleTags.length - 3} more
							</Badge>
						</HoverCard.Trigger>
						<HoverCard.Content>
							<Flex gap="1" wrap="wrap">
								{articleTags.slice(3).map((tag) => (
									<Link
										key={`${url}-remaining-${tag}`}
										href={`/links/topic/${encodeURIComponent(tag)}`}
										className={styles.linkTag}
									>
										<Badge variant="soft" color="gray" size="1">
											{formatTag(tag)}
										</Badge>
									</Link>
								))}
							</Flex>
						</HoverCard.Content>
					</HoverCard.Root>
				</span>
			)}
		</Flex>
	);
};

export default LinkMetadata;
