import type { FilterPreset } from "@sill/schema";
import { Pencil, Plus } from "lucide-react";
import { useFetcher, useNavigation, useSearchParams } from "react-router";
import { setStoredFilters } from "~/hooks/useFilterStorage";
import {
	BUILT_IN_FEEDS,
	PRESET_KEYS,
	type PresetConfig,
	isActivePreset,
} from "~/utils/filterPresets";
import styles from "./FeedTabs.module.css";

type PresetTab = Pick<FilterPreset, "id" | "name" | "filters">;

interface FeedTabsProps {
	presets: PresetTab[];
	isPlus: boolean;
	// The current state is worth saving as a new feed (drives the "+" tab).
	canSave: boolean;
	onSave: () => void;
	// Open the feed manager (rename / update / delete live there, not inline).
	onManage: () => void;
}

/**
 * The feed switcher: the built-in feeds (Trending, Fresh links) and saved views
 * as one horizontally scrolling strip of plain-text switch targets. Selecting a
 * feed recalls its clean config; a "Custom" marker shows when the state matches
 * no feed; "Edit" opens the manager; the trailing "+" saves the current state.
 *
 * The strip is switch-only: management (rename, update, delete) moved to the
 * ManageFeedsDialog so a feed's tap target is the whole label, not a label
 * fighting a tiny inline ✕.
 */
const FeedTabs = ({
	presets,
	isPlus,
	canSave,
	onSave,
	onManage,
}: FeedTabsProps) => {
	const [searchParams, setSearchParams] = useSearchParams();
	const navigation = useNavigation();
	// Reflect the target feed optimistically while it loads, so the tab you tapped
	// highlights immediately rather than lagging until the load commits.
	const pendingSearch =
		navigation.state === "loading" && navigation.location
			? new URLSearchParams(navigation.location.search)
			: null;
	const eff = pendingSearch ?? searchParams;

	const mutation = useFetcher<{ presets?: PresetTab[] }>({
		key: "filter-presets",
	});
	// The API only returns saved feeds for Sill+ users (see /api/filter-presets),
	// so the list is already empty for free users.
	const saved = mutation.data?.presets ?? presets;

	// Built-in feeds and saved feeds are one kind of thing: the active feed is
	// whichever one the current state matches exactly. Built-ins come first, so a
	// saved view that duplicates one doesn't steal its highlight. Nothing matches
	// once the feed is refined off a preset (see the Custom marker below).
	const feeds = [...BUILT_IN_FEEDS, ...saved];
	const activeFeed = feeds.find((f) =>
		isActivePreset(f.filters as PresetConfig, eff),
	);

	const applyPreset = (config: PresetConfig) => {
		setStoredFilters(config);
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			for (const key of PRESET_KEYS) {
				const value = config[key];
				if (value) next.set(key, value);
				else next.delete(key);
			}
			next.delete("page");
			return next;
		});
	};

	return (
		<div className={styles.bar}>
			<div className={styles.strip}>
				{feeds.map((feed) => {
					const active = activeFeed?.id === feed.id;
					return (
						<button
							key={feed.id}
							type="button"
							className={`${styles.tab} ${active ? styles.active : ""}`}
							onClick={() => applyPreset(feed.filters as PresetConfig)}
						>
							{feed.name}
						</button>
					);
				})}

				{/* Off every feed. If it can be saved, the marker *is* the save action
				    (which already signals "unsaved view"), so there's no separate
				    Custom label to puzzle over. Otherwise a plain marker keeps the
				    strip from reading as "nothing selected." */}
				{!activeFeed &&
					(isPlus && canSave ? (
						<button
							type="button"
							className={`${styles.tab} ${styles.addTab}`}
							aria-label="Save current view as a feed"
							onClick={onSave}
						>
							<Plus size={15} />
							Save feed
						</button>
					) : (
						<span
							className={`${styles.tab} ${styles.active} ${styles.customTab}`}
						>
							Custom
						</span>
					))}
			</div>

			{/* Feed management is a rare, deliberate action, so it's pinned outside
			    the scrolling strip where it stays reachable instead of scrolling off
			    the right edge. */}
			{saved.length > 0 && (
				<button
					type="button"
					className={styles.manage}
					aria-label="Manage feeds"
					onClick={onManage}
				>
					<Pencil size={17} />
				</button>
			)}
		</div>
	);
};

export default FeedTabs;
