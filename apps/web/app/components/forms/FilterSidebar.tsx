import { Box, Button, Flex, Separator, Text } from "@radix-ui/themes";
import type {
	FilterPreset,
	SubscriptionStatus,
	list as listTable,
} from "@sill/schema";
import { Form } from "react-router";
import { useLinkFilters } from "~/hooks/useLinkFilters";
import FilterPanel from "./FilterPanel";
import FilterPresets from "./FilterPresets";
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
 * The desktop feed filters: everything expanded in the right rail rather than
 * behind a popover. Shares all state with the mobile FilterBar via
 * useLinkFilters, so both layouts stay in sync through the URL.
 */
const FilterSidebar = ({
	showService,
	lists,
	subscribed,
	presets,
	hideSearch = false,
}: FilterSidebarProps) => {
	const {
		isPlus,
		savable,
		canSave,
		resetFilters,
		panelProps,
		saveOpen,
		setSaveOpen,
	} = useLinkFilters({
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
					<Form method="GET" onSubmit={(e) => e.preventDefault()}>
						<SearchField rounded />
					</Form>
				)}

				<Box>
					<SectionLabel>View</SectionLabel>
					<FilterPresets
						presets={presets}
						lists={lists}
						saveOpen={saveOpen}
						onSaveOpenChange={setSaveOpen}
						triggerVariant="select"
					/>
				</Box>

				<Separator size="4" />

				{/* Wrapped so the panel's own group spacing (mb) governs, rather than
				    stacking with this column's gap into a double gap. */}
				<Box>
					<FilterPanel variant="chips" {...panelProps} />
				</Box>

				{/* Only when there's something to act on: no lonely disabled button. */}
				{savable && (
					<Flex justify="between" align="center" gap="3">
						{isPlus && canSave ? (
							<Button
								size="2"
								variant="ghost"
								onClick={() => setSaveOpen(true)}
							>
								Save as view
							</Button>
						) : (
							<span />
						)}
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
