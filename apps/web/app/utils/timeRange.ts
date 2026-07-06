export interface TimeOption {
	value: string;
	label: string;
	/** Reserved for Sill+ subscribers; disabled with a Plus tag for free users. */
	plus?: boolean;
}

/**
 * The time-window options shared by the main links feed and the discovery
 * pages. Default (empty value → no `time` param) is 24 hours; the multi-day
 * windows are Sill+ only.
 */
export const TIME_OPTIONS: TimeOption[] = [
	{ value: "3h", label: "3 hours" },
	{ value: "6h", label: "6 hours" },
	{ value: "12h", label: "12 hours" },
	{ value: "", label: "24 hours" },
	{ value: "7d", label: "7 days", plus: true },
	{ value: "14d", label: "14 days", plus: true },
	{ value: "30d", label: "30 days", plus: true },
];

/**
 * Time windows that are reserved for Sill+ subscribers. Free users see these
 * disabled in the filter and are clamped server-side.
 */
export const PLUS_TIME_VALUES = ["7d", "14d", "30d"] as const;

export const isPlusTimeValue = (param: string | null | undefined): boolean =>
	param != null && (PLUS_TIME_VALUES as readonly string[]).includes(param);

/**
 * Human label for the active time window, honoring the Sill+ gate: a free user
 * carrying a locked window reads as the clamped 24h default.
 */
export const timeLabel = (
	param: string | null | undefined,
	isPlus: boolean,
): string => {
	const option = TIME_OPTIONS.find((o) => o.value === (param || ""));
	if (option?.plus && !isPlus) return "24 hours";
	return option?.label || "24 hours";
};

/**
 * Translate the `time` search param (e.g. "6h", "2d") into a window in
 * milliseconds. Shared by the links list loader and the on-demand link-posts
 * route so both request the same window. Defaults to 24h.
 */
export const timeParamToMs = (param: string | null): number => {
	switch (param) {
		case "3h":
			return 10800000;
		case "6h":
			return 21600000;
		case "12h":
			return 43200000;
		case "1d":
			return 86400000; // 1 day
		case "2d":
			return 172800000; // 2 days
		case "3d":
			return 259200000; // 3 days
		case "7d":
			return 604800000; // 7 days
		case "14d":
			return 1209600000; // 14 days
		case "30d":
			return 2592000000; // 30 days
		default:
			return 86400000; // 24 hours
	}
};
