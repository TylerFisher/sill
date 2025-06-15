import { useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";

export interface FilterState {
	time?: string;
	reposts?: string;
	sort?: string;
	service?: string;
	list?: string;
	query?: string;
	minShares?: string;
}

const STORAGE_KEY = "sill-filter-preferences";

export const useFilterStorage = () => {
	const [searchParams, setSearchParams] = useSearchParams();

	const saveFiltersToStorage = useCallback((filters: FilterState) => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
		} catch (error) {
			console.warn("Failed to save filters to localStorage:", error);
		}
	}, []);

	const loadFiltersFromStorage = useCallback((): FilterState | null => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			return stored ? JSON.parse(stored) : null;
		} catch (error) {
			console.warn("Failed to load filters from localStorage:", error);
			return null;
		}
	}, []);

	const getCurrentFilters = useCallback((): FilterState => {
		return {
			time: searchParams.get("time") || undefined,
			reposts: searchParams.get("reposts") || undefined,
			sort: searchParams.get("sort") || undefined,
			service: searchParams.get("service") || undefined,
			list: searchParams.get("list") || undefined,
			query: searchParams.get("query") || undefined,
			minShares: searchParams.get("minShares") || undefined,
		};
	}, [searchParams]);

	const applyFiltersToUrl = useCallback(
		(filters: FilterState) => {
			setSearchParams((prev) => {
				const newParams = new URLSearchParams(prev);

				for (const [key, value] of Object.entries(filters)) {
					if (value && value !== "") {
						newParams.set(key, value);
					} else {
						newParams.delete(key);
					}
				}

				return newParams;
			});
		},
		[setSearchParams],
	);

	const hasAnyFilters = useCallback((): boolean => {
		return searchParams.size > 0;
	}, [searchParams]);

	// Load saved filters only on mount
	useEffect(() => {
		if (searchParams.size === 0) {
			const savedFilters = loadFiltersFromStorage();
			if (savedFilters) {
				applyFiltersToUrl(savedFilters);
			}
		}
	}, []);

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
	};
};
