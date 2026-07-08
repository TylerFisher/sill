import { Box, Button, Flex, Text } from "@radix-ui/themes";
import type {
	FilterPreset,
	SubscriptionStatus,
	list as listTable,
} from "@sill/schema";
import { Form } from "react-router";
import { useLinkFilters } from "~/hooks/useLinkFilters";
import FilterPanel from "./FilterPanel";
import SearchField from "./SearchField";

interface FilterSidebarProps {
	showService: boolean;
	lists: (typeof listTable.$inferSelect)[];
	subscribed: SubscriptionStatus;
	presets: Pick<FilterPreset, "id" | "name" | "filters">[];
	// Discovery pages (author/domain) reuse the sidebar but don't support search.
	hideSearch?: boolean;
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
	<Text
		as="p"
		size="1"
		color="gray"
		mb="2"
		style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
	>
		{children}
	</Text>
);

/**
 * The desktop refine controls: search plus the filter sliders/selects, expanded
 * in the right rail. Sort and saved views live in the FeedTabs strip at the top
 * of the center column instead. Shares all state with the tabs via
 * useLinkFilters (through the URL).
 */
const FilterSidebar = ({
	showService,
	lists,
	subscribed,
	presets,
	hideSearch = false,
}: FilterSidebarProps) => {
	const { savable, resetFilters, panelProps } = useLinkFilters({
		lists,
		subscribed,
		presets,
		showService,
		ownsRestore: false,
	});

	return (
		<Box pt="6" pr="3">
			<Flex direction="column" gap="4">
				{!hideSearch && (
					<Box>
						<SectionLabel>Search</SectionLabel>
						<Form method="GET" onSubmit={(e) => e.preventDefault()}>
							<SearchField rounded hideSubmitButton />
						</Form>
					</Box>
				)}

				{/* Wrapped so the panel's own group spacing (mb) governs, rather than
				    stacking with this column's gap into a double gap. */}
				<Box>
					<FilterPanel {...panelProps} />
				</Box>

				{savable && (
					<Flex justify="end">
						<Button
							size="2"
							variant="ghost"
							color="gray"
							onClick={resetFilters}
						>
							Reset
						</Button>
					</Flex>
				)}
			</Flex>
		</Box>
	);
};

export default FilterSidebar;
