import { useState } from "react";
import { useSearchParams } from "@remix-run/react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import { Box, Button } from "@radix-ui/themes";
import FilterButtonGroup, {
	type ButtonGroup,
} from "~/components/forms/FilterButtonGroup";

const LinkFilters = () => {
	const [open, setOpen] = useState(false);
	const [searchParams, setSearchParams] = useSearchParams();

	function setSearchParam(param: string, value: string) {
		setSearchParams((prev) => {
			prev.set(param, value);
			return prev;
		});
	}

	const buttonGroups: ButtonGroup[] = [
		{
			heading: "Show posts from the last",
			defaultValue: searchParams.get("time") || "86400000",
			param: "time",
			buttons: [
				{
					value: "10800000",
					label: "3 hours",
				},
				{
					value: "21600000",
					label: "6 hours",
				},
				{
					value: "43200000",
					label: "12 hours",
				},
				{
					value: "86400000",
					label: "24 hours",
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
		{
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
		},
	];

	return (
		<Collapsible.Root
			className="CollapsibleRoot"
			open={open}
			onOpenChange={setOpen}
		>
			<Collapsible.Trigger asChild>
				<Button variant="ghost" size="2">
					Filters
					{open ? <ChevronUpIcon /> : <ChevronDownIcon />}
				</Button>
			</Collapsible.Trigger>
			<Collapsible.Content>
				<Box mt="4">
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
			</Collapsible.Content>
		</Collapsible.Root>
	);
};

export default LinkFilters;
