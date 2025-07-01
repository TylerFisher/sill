import { Badge, Flex, Text } from "@radix-ui/themes";
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
				<Text as="p" size="1" color="gray" mt="2">
					{authors && <>by {authors?.join(", ")}</>}
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
