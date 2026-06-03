import { Box, Flex } from "@radix-ui/themes";
import type { list } from "@sill/schema";
import { Form } from "react-router";
import { useFilterStorage } from "~/hooks/useFilterStorage";
import FilterPresetList from "./FilterPresetList";
import styles from "./LinkFilters.module.css";
import SearchField from "./SearchField";

const LinkFilters = ({
	showService,
	lists,
	reverse = false,
	hideSort = false,
	hideSearch = false,
	timeOptions,
}: {
	showService: boolean;
	lists: (typeof list.$inferSelect)[];
	reverse?: boolean;
	hideSort?: boolean;
	hideSearch?: boolean;
	timeOptions?: { value: string; label: string }[];
}) => {
	useFilterStorage();

	return (
		<div className={styles["filter-container"]}>
			<Flex direction={reverse ? "column-reverse" : "column"}>
				{!hideSearch && (
					<Box mt={reverse ? "2" : "6"} mb={reverse ? "3" : "0"}>
						<Form method="GET" onSubmit={(e) => e.preventDefault()}>
							<SearchField />
						</Form>
					</Box>
				)}
				<Box mt={reverse ? "3" : "6"}>
					<FilterPresetList
						showService={showService}
						lists={lists}
						hideSort={hideSort}
						timeOptions={timeOptions}
					/>
				</Box>
			</Flex>
		</div>
	);
};

export default LinkFilters;
