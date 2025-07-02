import { Badge, Flex, HoverCard, Text } from "@radix-ui/themes";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

interface LinkMetadataProps {
	authors: string[] | null;
	publishDate: Date | null;
	articleTags: string[];
	url: URL;
}

const LinkMetadata = ({
	authors,
	publishDate,
	articleTags,
	url,
}: LinkMetadataProps) => {
	return (
		<>
			{(authors || publishDate) && (
				<Text as="p" size="1" color="gray" mt="1">
					{authors && (
						<>
							by{" "}
							{authors.length === 2
								? authors.join(" and ")
								: authors.length > 2
									? `${authors.slice(0, -1).join(", ")} and ${authors[authors.length - 1]}`
									: authors[0]}
						</>
					)}
					{authors && publishDate && (
						<Text as="span" mx="1">
							•
						</Text>
					)}
					{publishDate && (
						<Text as="span">{timeAgo.format(publishDate, "round-minute")}</Text>
					)}
				</Text>
			)}
			{articleTags.length > 0 && (
				<Flex gap="1" wrap="wrap" mt="2">
					{articleTags.slice(0, 3).map((tag) => (
						<Badge
							key={`${url}-${tag}`}
							variant="soft"
							color="gray"
							size="1"
						>
							{tag}
						</Badge>
					))}
					{articleTags.length > 3 && (
						<HoverCard.Root>
							<HoverCard.Trigger>
								<Badge
									variant="outline"
									color="gray"
									size="1"
								>
									+{articleTags.length - 3} more
								</Badge>
							</HoverCard.Trigger>
							<HoverCard.Content>
								<Flex gap="1" wrap="wrap">
									{articleTags.slice(3).map((tag) => (
										<Badge
											key={`${url}-remaining-${tag}`}
											variant="soft"
											color="gray"
											size="1"
										>
											{tag}
										</Badge>
									))}
								</Flex>
							</HoverCard.Content>
						</HoverCard.Root>
					)}
				</Flex>
			)}
		</>
	);
};

export default LinkMetadata;
