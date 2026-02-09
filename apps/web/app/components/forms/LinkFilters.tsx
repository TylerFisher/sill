import { Box, Flex } from "@radix-ui/themes";
import { Form } from "react-router";
import type { list } from "@sill/schema";
import { useFilterStorage } from "~/hooks/useFilterStorage";
import styles from "./LinkFilters.module.css";
import SearchField from "./SearchField";
import FilterPresetList from "./FilterPresetList";

const LinkFilters = ({
	showService,
	lists,
	reverse = false,
	hideSort = false,
}: {
	showService: boolean;
	lists: (typeof list.$inferSelect)[];
	reverse?: boolean;
	hideSort?: boolean;
}) => {
	useFilterStorage();

	return (
		<div className={styles["filter-container"]}>
			<Flex direction={reverse ? "column-reverse" : "column"}>
				<Box mt={reverse ? "2" : "6"} mb={reverse ? "3" : "0"}>
					<Form method="GET" onSubmit={(e) => e.preventDefault()}>
						<SearchField />
					</Form>
				</Box>
				<Box mt={reverse ? "3" : "6"}>
					<FilterPresetList
						showService={showService}
						lists={lists}
						hideSort={hideSort}
					/>
				</Box>
			</Flex>
		</div>
	);
};

export default LinkFilters;
