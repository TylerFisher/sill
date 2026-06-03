import { timeParamToMs } from "./timeRange";

/** Default window for the discovery pages — wider than the main feed's 24h. */
export const DISCOVERY_DEFAULT_MS = 1209600000; // 14 days

/**
 * Time-filter options for the discovery pages, replacing the main feed's
 * sub-day set. The default (empty value → no `time` param) is 14 days; see
 * `DISCOVERY_DEFAULT_MS`.
 */
export const DISCOVERY_TIME_OPTIONS = [
	{ value: "1d", label: "1 day" },
	{ value: "3d", label: "3 days" },
	{ value: "7d", label: "7 days" },
	{ value: "", label: "14 days" },
];

/** The active time-filter's human label (e.g. "14 days"), for copy. */
export const discoveryTimeLabel = (sp: URLSearchParams): string => {
	const value = sp.get("time") || "";
	return (
		DISCOVERY_TIME_OPTIONS.find((o) => o.value === value)?.label ?? "14 days"
	);
};

/**
 * The main-feed filters that the by-author / by-domain discovery pages support,
 * parsed from the URL search params. Shared by both loaders so they map the
 * filter UI's params to the API the same way.
 */
export interface DiscoveryFilterParams {
	/** Window in ms (defaults to 24h via `timeParamToMs`). */
	time: number;
	service?: "mastodon" | "bluesky" | "all";
	/** Sill list id (`all`/absent → no list scope). */
	list?: string;
	reposts?: "exclude" | "only";
	minShares?: number;
	/** AppView accepts `popularity` | `recency`; the UI's "newest" maps to recency. */
	sort: "popularity" | "recency";
}

export const parseDiscoveryFilters = (
	sp: URLSearchParams,
): DiscoveryFilterParams => {
	const service = sp.get("service");
	const reposts = sp.get("reposts");
	const list = sp.get("list");
	const sort = sp.get("sort");
	const minShares = Number.parseInt(sp.get("minShares") ?? "", 10);
	const timeParam = sp.get("time");

	return {
		// No `time` param → the wider discovery default (14 days), not the main
		// feed's 24h; an explicit pick (1d/3d/7d) uses the standard mapping.
		time: timeParam ? timeParamToMs(timeParam) : DISCOVERY_DEFAULT_MS,
		service:
			service === "mastodon" || service === "bluesky" || service === "all"
				? service
				: undefined,
		list: list && list !== "all" ? list : undefined,
		reposts: reposts === "exclude" || reposts === "only" ? reposts : undefined,
		minShares:
			Number.isFinite(minShares) && minShares > 1 ? minShares : undefined,
		sort: sort === "newest" || sort === "recency" ? "recency" : "popularity",
	};
};
