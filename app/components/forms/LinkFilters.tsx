import * as Collapsible from "@radix-ui/react-collapsible";
import { Box, Button, Heading, Select, Text } from "@radix-ui/themes";
import { Form, useSearchParams } from "@remix-run/react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import FilterButtonGroup, {
	type ButtonGroup,
} from "~/components/forms/FilterButtonGroup";
import type { list } from "~/drizzle/schema.server";
import styles from "./LinkFilters.module.css";
import SearchField from "./SearchField";

const LinkFilters = ({
	showService,
	lists,
}: { showService: boolean; lists: (typeof list.$inferSelect)[] }) => {
	const [open, setOpen] = useState(false);
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
					label: "3h",
				},
				{
					value: "6h",
					label: "6h",
				},
				{
					value: "12h",
					label: "12h",
				},
				{
					value: "24h",
					label: "24h",
				},
			],
		},
		{
			heading: "Hide reposts",
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

	return (
		<>
			<Box mt="6">
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
						variantCheck={group.defaultValue}
					/>
				))}
			</Box>

			{lists.length > 0 && (
				<Box my="3">
					<Heading
						mb="1"
						size="1"
						as="h5"
						style={{
							textTransform: "uppercase",
						}}
					>
						Lists
					</Heading>
					<Select.Root
						value={searchParams.get("list") || "all"}
						onValueChange={(value) => setSearchParam("list", value)}
					>
						<Select.Trigger placeholder="Select a list" />
						<Select.Content>
							<Select.Item value="all">All</Select.Item>
							{lists.map((list) => (
								<Select.Item key={list.uri} value={list.id}>
									{list.name}
								</Select.Item>
							))}
						</Select.Content>
					</Select.Root>
				</Box>
			)}
		</>
	);
};

export default LinkFilters;
