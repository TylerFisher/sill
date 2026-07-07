import type {
	FilterPreset,
	SubscriptionStatus,
	list as listTable,
} from "@sill/schema";
import { useState } from "react";
import { useNavigation, useSearchParams } from "react-router";
import { useFilterStorage } from "./useFilterStorage";

// Keys the "Reset" action and the active-count consider. Sort is excluded: it's
// chosen via the built-in Views (Most popular / Newest), not the Filters panel.
const FILTER_KEYS = [
	"time",
	"minShares",
	"reposts",
	"service",
	"list",
] as const;

interface UseLinkFiltersArgs {
	lists: (typeof listTable.$inferSelect)[];
	subscribed: SubscriptionStatus;
	presets: Pick<FilterPreset, "id" | "name" | "filters">[];
	showService: boolean;
	// Exactly one consumer per page owns the mount-time restore (see
	// useFilterStorage), or the two layouts would both try to restore and clobber
	// each other. The mobile FilterBar owns it; the desktop sidebar just reads the
	// params it produces.
	ownsRestore?: boolean;
}

/**
 * Shared filter state for the feed's two layouts: the mobile FilterBar and the
 * desktop FilterSidebar. Reads/writes the URL search params (the source of
 * truth), surfaces the pending group during a slow filter load, and owns the
 * save-view dialog's open state.
 */
export const useLinkFilters = ({
	lists,
	subscribed,
	presets,
	showService,
	ownsRestore = false,
}: UseLinkFiltersArgs) => {
	const [searchParams, setSearchParams] = useSearchParams();
	const { clearFilterFromStorage } = useFilterStorage({
		restoreOnMount: ownsRestore,
	});
	const isPlus = subscribed === "plus";
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
			// The search query is part of the savable state, so Reset clears it too.
			prev.delete("query");
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

	// The "Filters (N)" badge counts the filter-panel filters only (not search
	// or sort). Saving/resetting, though, also consider the search query.
	const activeCount = FILTER_KEYS.filter((k) => eff.get(k)).length;
	const query = eff.get("query") ?? "";
	const savable = activeCount > 0 || query !== "";
	// Whether the live state already matches a saved view (don't offer to save a
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
			(p.filters.sort ?? "") === currentSort &&
			(p.filters.query ?? "") === query,
	);
	const canSave = savable && !alreadySaved;

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

	return {
		isPlus,
		activeCount,
		savable,
		canSave,
		pendingGroup,
		resetFilters,
		panelProps,
		saveOpen,
		setSaveOpen,
	};
};
