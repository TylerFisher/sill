import {
	Box,
	Button,
	Dialog,
	Flex,
	IconButton,
	Spinner,
	Text,
} from "@radix-ui/themes";
import type {
	FilterPreset,
	SubscriptionStatus,
	list as listTable,
} from "@sill/schema";
import { ChevronDown, X } from "lucide-react";
import { useState } from "react";
import { Form } from "react-router";
import { useLinkFilters } from "~/hooks/useLinkFilters";
import FilterPanel from "./FilterPanel";
import FilterPresets from "./FilterPresets";
import styles from "./PresetFilterItem.module.css";
import SearchField from "./SearchField";

interface FilterBarProps {
	showService: boolean;
	lists: (typeof listTable.$inferSelect)[];
	subscribed: SubscriptionStatus;
	presets: Pick<FilterPreset, "id" | "name" | "filters">[];
	// Discovery pages (author/domain) reuse the bar but don't support text search.
	hideSearch?: boolean;
}

/**
 * The mobile feed filters: a View chip (saved presets), a Filters control, and
 * a search field. Filters open in a dialog with the same sliders/selects as the
 * desktop sidebar. The routes render this bar only below the `sm` breakpoint;
 * at `sm`+ the filters live in FilterSidebar.
 */
const FilterBar = ({
	showService,
	lists,
	subscribed,
	presets,
	hideSearch = false,
}: FilterBarProps) => {
	const [filtersOpen, setFiltersOpen] = useState(false);
	const {
		isPlus,
		activeCount,
		savable,
		canSave,
		pendingGroup,
		resetFilters,
		panelProps,
		saveOpen,
		setSaveOpen,
	} = useLinkFilters({
		lists,
		subscribed,
		presets,
		showService,
		ownsRestore: true,
	});

	const chip = (active: boolean) =>
		`${styles.item} ${styles.chip} ${active ? styles.active : ""}`;

	const filtersTrigger = (
		<button type="button" className={`${chip(false)} ${styles.barChip}`}>
			<Text>{activeCount ? `Filters (${activeCount})` : "Filters"}</Text>
			{pendingGroup ? (
				<Spinner size="1" />
			) : (
				<ChevronDown
					width={14}
					height={14}
					style={{ opacity: 0.5, flexShrink: 0 }}
				/>
			)}
		</button>
	);

	// Filters apply live as they're tapped, so saving is optional. "Save as view"
	// is a secondary (ghost) action rather than the panel's main button.
	const openSave = () => {
		setFiltersOpen(false);
		setSaveOpen(true);
	};

	// Free users don't see "Save as view" at all; the Sill+ callout in the panel
	// is the only promotion of it.
	const saveButton = (size: "1" | "2") =>
		isPlus ? (
			<Button
				size={size}
				variant="ghost"
				disabled={!canSave}
				onClick={openSave}
			>
				Save as view
			</Button>
		) : null;

	return (
		<Box mb="5">
			<Flex gap="2" align="center">
				<FilterPresets
					presets={presets}
					lists={lists}
					saveOpen={saveOpen}
					onSaveOpenChange={setSaveOpen}
				/>

				<Dialog.Root open={filtersOpen} onOpenChange={setFiltersOpen}>
					<Dialog.Trigger>{filtersTrigger}</Dialog.Trigger>
					<Dialog.Content maxWidth="440px">
						<Flex align="center" justify="between" mb="2">
							<Dialog.Title size="4" mb="0">
								Filters
							</Dialog.Title>
							<Dialog.Close>
								<IconButton
									variant="ghost"
									color="gray"
									size="2"
									aria-label="Close"
								>
									<X size={20} />
								</IconButton>
							</Dialog.Close>
						</Flex>
						<Dialog.Description
							style={{
								position: "absolute",
								width: 1,
								height: 1,
								overflow: "hidden",
								clip: "rect(0 0 0 0)",
							}}
						>
							Filter and sort the feed
						</Dialog.Description>
						<FilterPanel {...panelProps} />
						<Box mt="4">
							{(isPlus || savable) && (
								<Flex justify="between" align="center" mb="3">
									{saveButton("2") ?? <span />}
									{savable ? (
										<Button
											size="2"
											variant="ghost"
											color="gray"
											onClick={resetFilters}
										>
											Reset
										</Button>
									) : (
										<span />
									)}
								</Flex>
							)}
							<Dialog.Close>
								<Button size="3" style={{ width: "100%" }}>
									Done
								</Button>
							</Dialog.Close>
						</Box>
					</Dialog.Content>
				</Dialog.Root>

				{/* Wider phones/tablet (>= 520px): search shares the row with the
				    chips so it isn't a too-wide band on its own. */}
				{!hideSearch && (
					<Box
						display={{ initial: "none", xs: "block" }}
						flexGrow="1"
						minWidth="0"
					>
						<Form method="GET" onSubmit={(e) => e.preventDefault()}>
							<SearchField rounded />
						</Form>
					</Box>
				)}
			</Flex>

			{/* Narrow phones (< 520px): not enough room, so search drops to its own
			    full-width row below the chips. */}
			{!hideSearch && (
				<Box display={{ initial: "block", xs: "none" }} mt="2">
					<Form method="GET" onSubmit={(e) => e.preventDefault()}>
						<SearchField rounded />
					</Form>
				</Box>
			)}
		</Box>
	);
};

export default FilterBar;
