import { Flex } from "@radix-ui/themes";
import type { SubscriptionStatus, list } from "@sill/schema";
import type { ReactNode } from "react";
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
	subscribed,
	afterSearch,
}: {
	showService: boolean;
	lists: (typeof list.$inferSelect)[];
	reverse?: boolean;
	hideSort?: boolean;
	hideSearch?: boolean;
	timeOptions?: { value: string; label: string; plus?: boolean }[];
	subscribed?: SubscriptionStatus;
	// Slot rendered directly below the search field (e.g. saved presets).
	afterSearch?: ReactNode;
}) => {
	useFilterStorage();

	const search = !hideSearch ? (
		<Form method="GET" onSubmit={(e) => e.preventDefault()}>
			<SearchField />
		</Form>
	) : null;

	const filters = (
		<FilterPresetList
			showService={showService}
			lists={lists}
			hideSort={hideSort}
			timeOptions={timeOptions}
			subscribed={subscribed}
		/>
	);

	return (
		<div className={styles["filter-container"]}>
			{/* Sections stack with a single, consistent gap. On desktop search
			    leads; in the mobile collapsible (`reverse`) it moves to the bottom,
			    which keeps it next to the on-screen keyboard when focused. */}
			<Flex
				direction="column"
				gap={reverse ? "3" : "6"}
				mt={reverse ? "0" : "6"}
			>
				{reverse ? (
					<>
						{afterSearch}
						{filters}
						{search}
					</>
				) : (
					<>
						{search}
						{afterSearch}
						{filters}
					</>
				)}
			</Flex>
		</div>
	);
};

export default LinkFilters;
