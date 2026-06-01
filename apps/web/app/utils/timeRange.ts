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
		default:
			return 86400000; // 24 hours
	}
};
