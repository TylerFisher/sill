import { TIME_OPTIONS } from "./timeRange";

// The filter params a view captures, including the free-text search query.
export const PRESET_KEYS = [
	"time",
	"service",
	"list",
	"minShares",
	"reposts",
	"sort",
	"query",
] as const;

export type PresetConfig = Partial<
	Record<(typeof PRESET_KEYS)[number], string>
>;

/** Build a preset config from the currently active URL params. */
export const configFromParams = (params: URLSearchParams): PresetConfig => {
	const config: PresetConfig = {};
	for (const key of PRESET_KEYS) {
		const value = params.get(key);
		if (value) config[key] = value;
	}
	return config;
};

/** True when the live params match this preset for every captured key. */
export const isActivePreset = (
	config: PresetConfig,
	params: URLSearchParams,
): boolean =>
	PRESET_KEYS.every((key) => (config[key] ?? "") === (params.get(key) ?? ""));

/**
 * A plain-language summary of a view's config, e.g. "Newest · 5+ shares ·
 * Bluesky", so a saved view reads clearly even when the name is vague.
 */
export const summarizeConfig = (
	config: PresetConfig,
	lists: { id: string; name: string }[],
): string => {
	const parts: string[] = [];
	if (config.query) parts.push(`"${config.query}"`);
	if (config.sort === "newest") parts.push("Newest");
	if (config.time) {
		const label = TIME_OPTIONS.find((o) => o.value === config.time)?.label;
		if (label) parts.push(label);
	}
	if (config.minShares) parts.push(`${config.minShares}+ shares`);
	if (config.reposts === "exclude") parts.push("No reposts");
	else if (config.reposts === "only") parts.push("Reposts only");
	if (config.service === "bluesky") parts.push("Bluesky");
	else if (config.service === "mastodon") parts.push("Mastodon");
	if (config.list) {
		const name = lists.find((l) => l.id === config.list)?.name;
		if (name) parts.push(name);
	}
	return parts.join(" · ");
};
