import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation, useSearchParams } from "react-router";

export interface FilterState {
	time?: string;
	reposts?: string;
	sort?: string;
	service?: string;
	list?: string;
	minShares?: string;
}

const STORAGE_KEY = "sill-filter-preferences";

/**
 * Most filters are only remembered on the main feed. The nested by-author /
 * by-publication discovery pages deliberately don't persist (or restore) the
 * full filter set: someone may open one of those pages weeks apart and would be
 * surprised to find a stale service/list filter from an earlier visit applied.
 *
 * The `time` window is the exception — it follows the user everywhere the filter
 * UI appears (see `isPersistable`), so choosing "30 days" on one page keeps that
 * window as they navigate between the feed and the discovery pages.
 */
const shouldPersist = (pathname: string): boolean =>
	!(
		pathname.startsWith("/links/author/") ||
		pathname.startsWith("/links/domain/")
	);

const readStore = (): FilterState => {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) return {};
		const filters = JSON.parse(stored);
		// Backwards compatibility: translate old boolean values to new strings.
		if (filters.reposts === "false") filters.reposts = "include";
		else if (filters.reposts === "true") filters.reposts = "exclude";
		return filters;
	} catch (error) {
		console.warn("Failed to load filters from localStorage:", error);
		return {};
	}
};

const writeStore = (filters: FilterState) => {
	try {
		// JSON.stringify drops undefined values, so empty keys don't linger.
		const clean = JSON.parse(JSON.stringify(filters)) as FilterState;
		if (Object.keys(clean).length === 0) {
			localStorage.removeItem(STORAGE_KEY);
		} else {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
		}
	} catch (error) {
		console.warn("Failed to save filters to localStorage:", error);
	}
};

/**
 * Overwrite the remembered main-feed filters with exactly `filters`. Applying a
 * view replaces the filter state, so an empty set (e.g. "Most popular") clears
 * storage and therefore persists across reloads. Imperative, so it never races
 * the mount-time restore. No-op on discovery pages (which don't persist), so
 * applying a view there can't clobber the main feed's remembered set.
 */
export const setStoredFilters = (filters: FilterState) => {
	if (typeof window !== "undefined" && !shouldPersist(window.location.pathname))
		return;
	writeStore(filters);
};

export const useFilterStorage = ({
	restoreOnMount = false,
}: { restoreOnMount?: boolean } = {}) => {
	const [searchParams, setSearchParams] = useSearchParams();
	const { pathname } = useLocation();
	const hasLoadedOnMount = useRef(false);

	const persist = useMemo(() => shouldPersist(pathname), [pathname]);

	// `time` is remembered on every page; the rest only on the main feed.
	const isPersistable = useCallback(
		(key: keyof FilterState) => persist || key === "time",
		[persist],
	);

	const saveFiltersToStorage = useCallback(
		(filters: FilterState) => {
			if (persist) {
				// Main feed: the current filters are the source of truth.
				writeStore(filters);
				return;
			}
			// Discovery pages: only carry the time window forward, leaving any
			// remembered feed filters (service/list/etc.) untouched. Clearing is
			// handled explicitly via clearFilterFromStorage.
			if (!filters.time) return;
			writeStore({ ...readStore(), time: filters.time });
		},
		[persist],
	);

	const clearFilterFromStorage = useCallback(
		(key: keyof FilterState) => {
			if (!isPersistable(key)) return;
			const filters = readStore();
			delete filters[key];
			writeStore(filters);
		},
		[isPersistable],
	);

	const loadFiltersFromStorage = useCallback((): FilterState | null => {
		const filters = readStore();
		return Object.keys(filters).length > 0 ? filters : null;
	}, []);

	const getCurrentFilters = useCallback((): FilterState => {
		return {
			time: searchParams.get("time") || undefined,
			reposts: searchParams.get("reposts") || undefined,
			sort: searchParams.get("sort") || undefined,
			service: searchParams.get("service") || undefined,
			list: searchParams.get("list") || undefined,
			minShares: searchParams.get("minShares") || undefined,
		};
	}, [searchParams]);

	const applyFiltersToUrl = useCallback(
		(filters: FilterState) => {
			setSearchParams(
				(prev) => {
					const newParams = new URLSearchParams(prev);

					for (const [key, value] of Object.entries(filters)) {
						if (value && value !== "") {
							newParams.set(key, value);
						} else {
							newParams.delete(key);
						}
					}

					return newParams;
				},
				// Restoring saved filters shouldn't add a history entry — otherwise the
				// back button would step through the auto-applied filter state.
				{ replace: true },
			);
		},
		[setSearchParams],
	);

	const hasAnyFilters = useCallback((): boolean => {
		return searchParams.size > 0;
	}, [searchParams]);

	// Restore saved filters on mount. Only the designated owner runs this, so a
	// component that mounts later (e.g. the search field inside a popover) can't
	// re-trigger it and clobber the current filters.
	useEffect(() => {
		if (!restoreOnMount) return;
		if (hasLoadedOnMount.current) return;
		hasLoadedOnMount.current = true;

		const savedFilters = loadFiltersFromStorage();
		if (!savedFilters) return;

		// Main feed, entered without any params: restore the full remembered set.
		if (persist && searchParams.size === 0) {
			applyFiltersToUrl(savedFilters);
			return;
		}

		// Otherwise still carry the remembered time window forward when the URL
		// doesn't already specify one. This is what makes the time filter follow
		// the user across the feed and discovery pages.
		if (savedFilters.time && !searchParams.has("time")) {
			applyFiltersToUrl({ time: savedFilters.time });
		}
	}, [
		restoreOnMount,
		persist,
		searchParams,
		loadFiltersFromStorage,
		applyFiltersToUrl,
	]);

	useEffect(() => {
		const currentFilters = getCurrentFilters();
		const hasActiveFilters = Object.values(currentFilters).some(
			(value) => value && value !== "",
		);

		if (hasActiveFilters) {
			saveFiltersToStorage(currentFilters);
		}
	}, [getCurrentFilters, saveFiltersToStorage]);

	return {
		saveFiltersToStorage,
		loadFiltersFromStorage,
		getCurrentFilters,
		applyFiltersToUrl,
		clearFilterFromStorage,
	};
};
