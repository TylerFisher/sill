import { Box, Button, Flex, Heading, Select, Text } from "@radix-ui/themes";
import { Form, useSearchParams } from "@remix-run/react";
import { useState } from "react";
import FilterButtonGroup, {
	type ButtonGroup,
} from "~/components/forms/FilterButtonGroup";
import type { list } from "~/drizzle/schema.server";
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

	function setSearchParam(param: string, value: string) {
		setSearchParams((prev) => {
			prev.set(param, value);
			return prev;
		});
	}

	function clearSearchParams() {
		setSearchParams([]);
	}

	const buttonGroups: ButtonGroup[] = [
		{
			heading: "Show posts from the last",
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
			],
		},
		{
			heading: "Exclude reposts",
			defaultValue: searchParams.get("reposts") || "false",
			param: "reposts",
			buttons: [
				{
					value: "true",
					label: "Yes",
				},
				{
					value: "false",
					label: "No",
				},
			],
		},
		{
			heading: "Sort by",
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
		<>
			<Flex direction={reverse ? "column-reverse" : "column"}>
				<Box mt={reverse ? "3" : "6"} mb={reverse ? "6" : "0"}>
					<Form method="GET">
						<SearchField />
					</Form>
				</Box>
				<Box mt="6">
					{buttonGroups.map((group, index) => (
						<FilterButtonGroup
							key={group.heading}
							heading={group.heading}
							param={group.param}
							buttonData={group.buttons}
							setter={setSearchParam}
							defaultValue={group.defaultValue}
						/>
					))}
				</Box>
			</Flex>

			{searchParams.size > 0 && (
				<Button onClick={clearSearchParams}>Reset to defaults</Button>
			)}
		</>
	);
};

export default LinkFilters;
