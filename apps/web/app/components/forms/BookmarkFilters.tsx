import {
	Badge,
	Box,
	Button,
	Flex,
	Heading,
	ScrollArea,
} from "@radix-ui/themes";
import { Form, useSearchParams } from "react-router";
import type { tag } from "@sill/schema";
import styles from "./LinkFilters.module.css";
import SearchField from "./SearchField";

const BookmarkFilters = ({
	tags,
	reverse = false,
}: {
	tags: (typeof tag.$inferSelect)[];
	reverse?: boolean;
}) => {
	const [searchParams, setSearchParams] = useSearchParams();

	function clearSearchParams() {
		setSearchParams([]);
	}

	function handleTagClick(tagName: string | null) {
		setSearchParams((prev) => {
			const newParams = new URLSearchParams(prev);
			if (tagName) {
				newParams.set("tag", tagName);
			} else {
				newParams.delete("tag");
			}
			return newParams;
		});
	}

	const hasActiveFilters = searchParams.get("query") || searchParams.get("tag");
	const currentTag = searchParams.get("tag");

	const sortedTags = [...tags].sort((a, b) =>
		a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
	);

	return (
		<div className={styles["filter-container"]}>
			<Flex direction={reverse ? "column-reverse" : "column"}>
				<Box mt={reverse ? "3" : "6"} mb={reverse ? "6" : "0"}>
					<Form method="GET">
						<SearchField />
					</Form>
				</Box>
				{tags.length > 0 && (
					<Box mt="6">
						<Heading size="2" mb="3" weight="medium">
							Tags
						</Heading>
						<ScrollArea
							type="auto"
							scrollbars="vertical"
							style={{ maxHeight: "400px" }}
						>
							<Flex gap="2" wrap="wrap" pr="3">
								<Badge
									variant={!currentTag ? "solid" : "soft"}
									size="2"
									style={{ cursor: "pointer" }}
									onClick={() => handleTagClick(null)}
								>
									All tags
								</Badge>
								{sortedTags.map((tag) => {
									const isActive = currentTag === tag.name;

									return (
										<Badge
											key={tag.id}
											variant={isActive ? "solid" : "soft"}
											size="2"
											style={{ cursor: "pointer" }}
											onClick={() => handleTagClick(tag.name)}
										>
											{tag.name}
										</Badge>
									);
								})}
							</Flex>
						</ScrollArea>
					</Box>
				)}
			</Flex>

			{hasActiveFilters && (
				<div className={styles["filter-actions"]}>
					<Button onClick={clearSearchParams}>Clear filters</Button>
				</div>
			)}
		</div>
	);
};

export default BookmarkFilters;
