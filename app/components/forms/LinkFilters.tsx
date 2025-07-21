import { Box, Button, Flex } from "@radix-ui/themes";
import { Form, useSearchParams } from "react-router";
import FilterButtonGroup, {
	type ButtonGroup,
} from "~/components/forms/FilterButtonGroup";
import type { list } from "~/drizzle/schema.server";
import { useFilterStorage } from "~/hooks/useFilterStorage";
import styles from "./LinkFilters.module.css";
import NumberInput from "./NumberInput";
import SearchField from "./SearchField";

const LinkFilters = ({
	showService,
	lists,
	reverse = false,
}: {
	showService: boolean;
	lists: (typeof list.$inferSelect)[];
	reverse?: boolean;
}) => {
	const [searchParams, setSearchParams] = useSearchParams();
	useFilterStorage();

	function setSearchParam(param: string, value: string) {
		setSearchParams((prev) => {
			prev.set(param, value);
			return prev;
		});
	}

	function clearSearchParams() {
		setSearchParams([]);
		// Clear filter preferences from localStorage
		try {
			localStorage.removeItem("sill-filter-preferences");
		} catch (error) {
			console.warn(
				"Failed to clear filter preferences from localStorage:",
				error,
			);
		}
	}

	const buttonGroups: ButtonGroup[] = [
		{
			heading: "Sort By",
			defaultValue: searchParams.get("sort") || "popularity",
			param: "sort",
			buttons: [
				{
					value: "newest",
					label: "Newest",
				},
				{
					value: "popularity",
					label: "Most popular",
				},
			],
		},
		{
			heading: "Time Range",
			defaultValue: searchParams.get("time") || "24h",
			param: "time",
			buttons: [
				{
					value: "3h",
					label: "3 hours",
				},
				{
					value: "6h",
					label: "6 hours",
				},
				{
					value: "12h",
					label: "12 hours",
				},
				{
					value: "24h",
					label: "24 hours",
				},
				{
					value: "2d",
					label: "2 days",
				},
				{
					value: "3d",
					label: "3 days",
				},
				{
					value: "7d",
					label: "7 days",
				},
			],
		},
		{
			heading: "Reposts",
			defaultValue: searchParams.get("reposts") || "false",
			param: "reposts",
			buttons: [
				{
					value: "false",
					label: "Include",
				},
				{
					value: "true",
					label: "Exclude",
				},
			],
		},
	];

	showService &&
		buttonGroups.push({
			heading: "Service",
			defaultValue: searchParams.get("service") || "all",
			param: "service",
			buttons: [
				{
					value: "bluesky",
					label: "Bluesky",
				},
				{
					value: "mastodon",
					label: "Mastodon",
				},
				{
					value: "all",
					label: "All",
				},
			],
		});

	if (lists.length > 0) {
		const listOptions = [
			{
				value: "all",
				label: "All",
			},
		];
		listOptions.push(
			...lists.map((list) => ({
				value: list.id,
				label: list.name,
			})),
		);
		buttonGroups.push({
			heading: "List",
			defaultValue: searchParams.get("list") || "all",
			param: "list",
			buttons: listOptions,
		});
	}

	return (
		<div className={styles["filter-container"]}>
			<Flex direction={reverse ? "column-reverse" : "column"}>
				<Box mt={reverse ? "3" : "6"} mb={reverse ? "6" : "0"}>
					<Form method="GET">
						<SearchField />
					</Form>
				</Box>
				<Box mt="6">
					<div className={styles["secondary-filters"]}>
						<NumberInput
							param="minShares"
							heading="Min. Shares"
							min={1}
							placeholder="1"
						/>
						{buttonGroups.map((group) => (
							<FilterButtonGroup
								key={group.heading}
								heading={group.heading}
								param={group.param}
								buttonData={group.buttons}
								setter={setSearchParam}
								defaultValue={group.defaultValue}
							/>
						))}
					</div>
				</Box>
			</Flex>

			{searchParams.size > 0 && (
				<div className={styles["filter-actions"]}>
					<Button onClick={clearSearchParams}>Reset to defaults</Button>
				</div>
			)}
		</div>
	);
};

export default LinkFilters;
