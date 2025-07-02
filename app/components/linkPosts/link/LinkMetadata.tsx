import { Badge, Button, Flex, Text } from "@radix-ui/themes";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
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
	const [isOpen, setIsOpen] = useState(false);
	return (
		<>
			{(authors || publishDate) && (
				<Text as="p" size="1" color="gray" mt="2">
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
				<Collapsible.Root open={isOpen} onOpenChange={setIsOpen}>
					<Collapsible.Trigger asChild>
						<Button variant="ghost" size="1" mt="2" color="gray">
							<Text>
								{articleTags.length} {articleTags.length === 1 ? "tag" : "tags"}
							</Text>
							{isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
						</Button>
					</Collapsible.Trigger>
					<Collapsible.Content>
						<Flex gap="1" wrap="wrap" mt="4">
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
					</Collapsible.Content>
				</Collapsible.Root>
			)}
		</>
	);
};

export default LinkMetadata;
