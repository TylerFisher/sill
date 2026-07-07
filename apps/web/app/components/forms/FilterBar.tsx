import {
	Box,
	Button,
	Dialog,
	Flex,
	IconButton,
	Popover,
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
import { Form, useNavigation, useSearchParams } from "react-router";
import { useFilterStorage } from "~/hooks/useFilterStorage";
import { useIsMobile } from "~/hooks/useIsMobile";
import FilterPanel from "./FilterPanel";
import FilterPresets from "./FilterPresets";
import styles from "./PresetFilterItem.module.css";
import SearchField from "./SearchField";

// Keys the "Reset" action and the active-count consider. Sort is excluded: it's
// chosen via the built-in Views (Most popular / Newest), not the Filters panel.
const FILTER_KEYS = [
	"time",
	"minShares",
	"reposts",
	"service",
	"list",
] as const;

interface FilterBarProps {
	showService: boolean;
	lists: (typeof listTable.$inferSelect)[];
	subscribed: SubscriptionStatus;
	presets: Pick<FilterPreset, "id" | "name" | "filters">[];
	// Discovery pages (author/domain) reuse the bar but don't support text search.
	hideSearch?: boolean;
}

/**
 * The feed filters: a Views chip (saved presets), a Filters control, and an
 * inline search field. On desktop Filters is a compact popover of chips; on
 * mobile it's a full-screen panel of large tappable rows. Search sits in the row
 * on desktop and drops to its own full-width row on mobile.
 */
const FilterBar = ({
	showService,
	lists,
	subscribed,
	presets,
	hideSearch = false,
}: FilterBarProps) => {
	const [searchParams, setSearchParams] = useSearchParams();
	// The stable owner of filter restore on the main feed (it stays mounted,
	// unlike the search field, which lives in a popover).
	const { clearFilterFromStorage } = useFilterStorage({ restoreOnMount: true });
	const isPlus = subscribed === "plus";
	const isMobile = useIsMobile();
	const [filtersOpen, setFiltersOpen] = useState(false);
	// Save dialog lives in FilterPresets (it owns the presets fetcher), but it's
	// opened from the Filters panel where the filters are actually built.
	const [saveOpen, setSaveOpen] = useState(false);

	// While a filter change is loading (the wider windows can take a while),
	// reflect the target selection optimistically and flag which group is pending
	// so its option can show a spinner.
	const navigation = useNavigation();
	const pendingSearch =
		navigation.state === "loading" && navigation.location
			? new URLSearchParams(navigation.location.search)
			: null;
	const eff = pendingSearch ?? searchParams;
	const changed = (key: string) =>
		pendingSearch !== null &&
		(pendingSearch.get(key) ?? "") !== (searchParams.get(key) ?? "");
	const pendingGroup = changed("time")
		? "time"
		: changed("minShares")
			? "shares"
			: changed("reposts")
				? "reposts"
				: changed("service") || changed("list")
					? "from"
					: null;

	const time = eff.get("time") || "";
	const reposts = eff.get("reposts") || "";
	const minShares = eff.get("minShares") || "";
	const activeService = eff.get("service");
	const activeList = eff.get("list");

	const setParam = (key: "time" | "minShares" | "reposts", value: string) => {
		setSearchParams((prev) => {
			if (value) prev.set(key, value);
			else prev.delete(key);
			return prev;
		});
		if (!value) clearFilterFromStorage(key);
	};

	// Service and list are mutually exclusive, so one control drives both params.
	const selectFrom = (value: string) => {
		setSearchParams((prev) => {
			prev.delete("service");
			prev.delete("list");
			if (value.startsWith("service:")) prev.set("service", value.slice(8));
			else if (value.startsWith("list:")) prev.set("list", value.slice(5));
			return prev;
		});
		if (value === "all") {
			clearFilterFromStorage("service");
			clearFilterFromStorage("list");
		}
	};

	const resetFilters = () => {
		setSearchParams((prev) => {
			for (const key of FILTER_KEYS) prev.delete(key);
			return prev;
		});
		for (const key of FILTER_KEYS) clearFilterFromStorage(key);
	};

	const sortedLists = [...lists].sort((a, b) => a.name.localeCompare(b.name));
	const fromValue = activeList
		? `list:${activeList}`
		: activeService
			? `service:${activeService}`
			: "all";

	const activeCount = FILTER_KEYS.filter((k) => eff.get(k)).length;
	// Whether the live filters already match a saved view (don't offer to save a
	// duplicate). Uses the loader list, so a just-created view only registers on
	// the next load — acceptable.
	const currentSort = eff.get("sort") ?? "";
	const alreadySaved = presets.some(
		(p) =>
			(p.filters.time ?? "") === time &&
			(p.filters.minShares ?? "") === minShares &&
			(p.filters.reposts ?? "") === reposts &&
			(p.filters.service ?? "") === (activeService ?? "") &&
			(p.filters.list ?? "") === (activeList ?? "") &&
			(p.filters.sort ?? "") === currentSort,
	);
	const canSave = activeCount > 0 && !alreadySaved;

	const chip = (active: boolean) =>
		`${styles.item} ${styles.chip} ${active ? styles.active : ""}`;

	const filtersTrigger = (
		<button type="button" className={chip(false)}>
			<Flex align="center" gap="2">
				<Text>{activeCount ? `Filters (${activeCount})` : "Filters"}</Text>
				{pendingGroup ? (
					<Spinner size="1" />
				) : (
					<ChevronDown width={14} height={14} style={{ opacity: 0.5 }} />
				)}
			</Flex>
		</button>
	);

	const panelProps = {
		time,
		minShares,
		reposts,
		fromValue,
		isPlus,
		showService,
		lists: sortedLists,
		setParam,
		selectFrom,
		pendingGroup,
	};

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

				{isMobile ? (
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
							<FilterPanel variant="rows" {...panelProps} />
							<Box mt="4">
								{(isPlus || activeCount > 0) && (
									<Flex justify="between" align="center" mb="3">
										{saveButton("2") ?? <span />}
										{activeCount > 0 ? (
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
				) : (
					<Popover.Root open={filtersOpen} onOpenChange={setFiltersOpen}>
						<Popover.Trigger>{filtersTrigger}</Popover.Trigger>
						<Popover.Content width="340px" maxHeight="70vh">
							<FilterPanel variant="chips" {...panelProps} />
							{(isPlus || activeCount > 0) && (
								<Flex justify="between" align="center" gap="3" mt="3">
									{saveButton("2") ?? <span />}
									{activeCount > 0 ? (
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
						</Popover.Content>
					</Popover.Root>
				)}

				{/* Desktop/tablet: an inline search field fills the rest of the row. */}
				{!hideSearch && (
					<Box
						display={{ initial: "none", sm: "block" }}
						flexGrow="1"
						minWidth="0"
					>
						<Form method="GET" onSubmit={(e) => e.preventDefault()}>
							<SearchField />
						</Form>
					</Box>
				)}
			</Flex>

			{/* Mobile: search gets its own full-width row so the chips above stay
			    a consistent size. */}
			{!hideSearch && (
				<Box display={{ initial: "block", sm: "none" }} mt="2">
					<Form method="GET" onSubmit={(e) => e.preventDefault()}>
						<SearchField />
					</Form>
				</Box>
			)}
		</Box>
	);
};

export default FilterBar;
