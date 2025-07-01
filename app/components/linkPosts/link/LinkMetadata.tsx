import { Badge, Flex, Text } from "@radix-ui/themes";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

interface LinkMetadataProps {
	author: string | null;
	publishDate: Date | null;
	articleTags: string[];
	url: URL;
}

const LinkMetadata = ({
	author,
	publishDate,
	articleTags,
	url,
}: LinkMetadataProps) => {
	return (
		<>
			{(author || publishDate) && (
				<Text as="p" size="1" color="gray" mt="2">
					{author && <>by {author}</>}
					{author && publishDate && (
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
					{articleTags.map((tag) => (
						<Badge
							key={`${url}-${tag}`}
							variant="outline"
							color="yellow"
							size="1"
						>
							{tag}
						</Badge>
					))}
				</Flex>
			)}
		</>
	);
};

export default LinkMetadata;
