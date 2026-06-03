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
 * Filters are only remembered on the main feed. The nested by-author /
 * by-publication discovery pages deliberately don't persist (or restore) filter
 * state: someone may open one of those pages weeks apart and would be surprised
 * to find a stale filter from an earlier visit applied. On those pages the hook
 * is a no-op.
 */
const shouldPersist = (pathname: string): boolean =>
	!(
		pathname.startsWith("/links/author/") ||
		pathname.startsWith("/links/domain/")
	);

export const useFilterStorage = () => {
	const [searchParams, setSearchParams] = useSearchParams();
	const { pathname } = useLocation();
	const hasLoadedOnMount = useRef(false);

	const persist = useMemo(() => shouldPersist(pathname), [pathname]);

	const saveFiltersToStorage = useCallback(
		(filters: FilterState) => {
			if (!persist) return;
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
			} catch (error) {
				console.warn("Failed to save filters to localStorage:", error);
			}
		},
		[persist],
	);

	const clearFilterFromStorage = useCallback(
		(key: keyof FilterState) => {
			if (!persist) return;
			try {
				const stored = localStorage.getItem(STORAGE_KEY);
				if (stored) {
					const filters = JSON.parse(stored);
					delete filters[key];
					if (Object.keys(filters).length === 0) {
						localStorage.removeItem(STORAGE_KEY);
					} else {
						localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
					}
				}
			} catch (error) {
				console.warn("Failed to update filter preferences:", error);
			}
		},
		[persist],
	);

	const loadFiltersFromStorage = useCallback((): FilterState | null => {
		if (!persist) return null;
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (!stored) return null;

			const filters = JSON.parse(stored);

			// Backwards compatibility: translate old boolean values to new string values
			if (filters.reposts === "false") {
				filters.reposts = "include";
			} else if (filters.reposts === "true") {
				filters.reposts = "exclude";
			}

			return filters;
		} catch (error) {
			console.warn("Failed to load filters from localStorage:", error);
			return null;
		}
	}, [persist]);

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

	// Restore saved filters on mount (main feed only — see `shouldPersist`).
	useEffect(() => {
		if (persist && !hasLoadedOnMount.current && searchParams.size === 0) {
			const savedFilters = loadFiltersFromStorage();
			if (savedFilters) {
				applyFiltersToUrl(savedFilters);
			}
			hasLoadedOnMount.current = true;
		}
	}, [persist, searchParams.size, loadFiltersFromStorage, applyFiltersToUrl]);

	useEffect(() => {
		if (!persist) return;
		const currentFilters = getCurrentFilters();
		const hasActiveFilters = Object.values(currentFilters).some(
			(value) => value && value !== "",
		);

		if (hasActiveFilters) {
			saveFiltersToStorage(currentFilters);
		}
	}, [persist, getCurrentFilters, saveFiltersToStorage]);

	return {
		saveFiltersToStorage,
		loadFiltersFromStorage,
		getCurrentFilters,
		applyFiltersToUrl,
		clearFilterFromStorage,
	};
};
