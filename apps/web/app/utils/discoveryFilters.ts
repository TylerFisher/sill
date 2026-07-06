import { isPlusTimeValue, timeLabel, timeParamToMs } from "./timeRange";

/** The active time-filter's human label (e.g. "24 hours"), for copy. */
export const discoveryTimeLabel = (
	sp: URLSearchParams,
	isPlus: boolean,
): string => timeLabel(sp.get("time"), isPlus);

/**
 * Append the active time window to a discovery link so the destination loads
 * with the right filter on the first request, avoiding the restore-and-reload
 * flash. Only the time window follows the user across pages (see
 * `useFilterStorage`); other filters are intentionally left behind.
 */
export const discoveryHref = (
	path: string,
	time: string | null | undefined,
): string => (time ? `${path}?time=${encodeURIComponent(time)}` : path);

/**
 * The main-feed filters that the by-author / by-domain discovery pages support,
 * parsed from the URL search params. Shared by both loaders so they map the
 * filter UI's params to the API the same way.
 */
export interface DiscoveryFilterParams {
	/** Window in ms (defaults to 24h; multi-day windows are Sill+ only). */
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
	isPlus: boolean,
): DiscoveryFilterParams => {
	const service = sp.get("service");
	const reposts = sp.get("reposts");
	const list = sp.get("list");
	const sort = sp.get("sort");
	const minShares = Number.parseInt(sp.get("minShares") ?? "", 10);
	const timeParam = sp.get("time");

	return {
		// Default 24h, matching the main feed. The multi-day windows are Sill+
		// only, so clamp a free user who arrives with one (stale saved filter,
		// hand-edited URL) back to the default.
		time: timeParamToMs(
			!isPlus && isPlusTimeValue(timeParam) ? null : timeParam,
		),
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
