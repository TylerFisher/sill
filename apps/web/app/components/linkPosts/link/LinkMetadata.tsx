import { Badge, Flex, HoverCard, Link, Spinner, Text } from "@radix-ui/themes";
import { X } from "lucide-react";
import { useFetcher } from "react-router";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";
import styles from "./LinkMetadata.module.css";
import type { BookmarkWithLinkPosts } from "~/routes/bookmarks";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

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

const TagBadge = ({ tag, url }: { tag: string; url: URL }) => {
	const fetcher = useFetcher();

	const handleDelete = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		const formData = new FormData();
		formData.append("url", url.toString());
		formData.append("tagName", tag);
		fetcher.submit(formData, {
			method: "POST",
			action: "/bookmarks/delete-tag",
		});
	};

	const isDeleting = fetcher.state === "submitting" || fetcher.state === "loading";

	return (
		<Flex
			gap="0"
			align="center"
			display="inline-flex"
			style={{
				backgroundColor: "var(--gray-a3)",
				borderRadius: "var(--radius-2)",
				overflow: "hidden",
			}}
		>
			<Link
				href={`/bookmarks/?tag=${encodeURIComponent(tag)}`}
				className={styles.linkTag}
				size="1"
				style={{
					textDecoration: "none",
					padding: "0 var(--space-2)",
					height: "20px",
					display: "flex",
					alignItems: "center",
					color: "var(--gray-12)",
				}}
			>
				{tag}
			</Link>
			<Flex
				asChild
				align="center"
				justify="center"
				style={{
					height: "20px",
					borderLeft: "1px solid var(--gray-a5)",
				}}
			>
				<button
					type="button"
					onClick={handleDelete}
					disabled={isDeleting}
					className={styles.deleteButton}
					data-deleting={isDeleting}
				>
					{isDeleting ? <Spinner size="1" /> : <X size={12} />}
				</button>
			</Flex>
		</Flex>
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
			{articleTags.slice(0, 6).map((tag) => (
				<TagBadge key={`${url}-${tag}`} tag={tag} url={url} />
			))}
			{articleTags.length > 3 && (
				<span>
					<HoverCard.Root>
						<HoverCard.Trigger>
							<Badge variant="outline" color="gray" size="1">
								+{articleTags.length - 6} more
							</Badge>
						</HoverCard.Trigger>
						<HoverCard.Content>
							<Flex gap="1" wrap="wrap">
								{articleTags.slice(6).map((tag) => (
									<TagBadge key={`${url}-remaining-${tag}`} tag={tag} url={url} />
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
