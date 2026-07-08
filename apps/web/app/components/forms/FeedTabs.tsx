import type { FilterPreset } from "@sill/schema";
import { Plus, X } from "lucide-react";
import { useFetcher, useNavigation, useSearchParams } from "react-router";
import { setStoredFilters } from "~/hooks/useFilterStorage";
import {
	PRESET_KEYS,
	type PresetConfig,
	isActivePreset,
} from "~/utils/filterPresets";
import styles from "./FeedTabs.module.css";

// The built-in feeds everyone gets: clean sort-only states. Switching to one
// clears any filters/search, so it's a fresh feed rather than a refined one.
const BUILT_IN = [
	{ id: "popular", name: "Most popular", sort: "" },
	{ id: "newest", name: "Newest", sort: "newest" },
];

interface FeedTabsProps {
	presets: Pick<FilterPreset, "id" | "name" | "filters">[];
	isPlus: boolean;
	// The current state is worth saving as a new feed (drives the "+" tab).
	canSave: boolean;
	onSave: () => void;
}

/**
 * The feed switcher: built-in sorts and saved views as one horizontally
 * scrolling tab strip. A built-in tab resets to a clean feed (that sort, no
 * filters/search); a saved-view tab recalls its full config; the trailing "+"
 * saves the current state as a new view.
 */
const FeedTabs = ({ presets, isPlus, canSave, onSave }: FeedTabsProps) => {
	const [searchParams, setSearchParams] = useSearchParams();
	const navigation = useNavigation();
	// Reflect the target feed optimistically while it loads, so the tab you tapped
	// highlights immediately — rather than a built-in matching the pending sort
	// before `savedMatch` catches up.
	const pendingSearch =
		navigation.state === "loading" && navigation.location
			? new URLSearchParams(navigation.location.search)
			: null;
	const eff = pendingSearch ?? searchParams;
	const sort = eff.get("sort") ?? "";

	const mutation = useFetcher<{ presets?: typeof presets; error?: string }>({
		key: "filter-presets",
	});
	const list = mutation.data?.presets ?? presets;

	const savedMatch = list.find((p) =>
		isActivePreset(p.filters as PresetConfig, eff),
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

	const deletePreset = (id: string) =>
		mutation.submit(
			{ intent: "delete", id },
			{ method: "post", action: "/api/filter-presets" },
		);

	return (
		<div className={styles.strip}>
			{BUILT_IN.map((b) => {
				const active = !savedMatch && sort === b.sort;
				return (
					<button
						key={b.id}
						type="button"
						className={`${styles.tab} ${active ? styles.active : ""}`}
						// A clean feed: just this sort, wiping any filters/search.
						onClick={() => applyPreset(b.sort ? { sort: b.sort } : {})}
					>
						{b.name}
					</button>
				);
			})}

			{list.map((preset) => {
				const active = savedMatch?.id === preset.id;
				return (
					<button
						key={preset.id}
						type="button"
						className={`${styles.tab} ${active ? styles.active : ""}`}
						onClick={() => applyPreset(preset.filters as PresetConfig)}
					>
						<span className={styles.tabName}>{preset.name}</span>
						{/* biome-ignore lint/a11y/useSemanticElements: a <button> can't be nested in the tab's button */}
						<span
							role="button"
							tabIndex={0}
							aria-label={`Delete view ${preset.name}`}
							className={styles.tabClose}
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								deletePreset(preset.id);
							}}
							onPointerDown={(e) => e.stopPropagation()}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									e.stopPropagation();
									deletePreset(preset.id);
								}
							}}
						>
							<X size={12} />
						</span>
					</button>
				);
			})}

			{isPlus && canSave && !savedMatch && (
				<button
					type="button"
					className={`${styles.tab} ${styles.addTab}`}
					aria-label="Save current view"
					onClick={onSave}
				>
					<Plus size={16} />
				</button>
			)}
		</div>
	);
};

export default FeedTabs;
