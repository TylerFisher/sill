import {
	Button,
	Dialog,
	DropdownMenu,
	Flex,
	IconButton,
	Spinner,
	Text,
	TextField,
} from "@radix-ui/themes";
import type { FilterPreset } from "@sill/schema";
import { Check, ChevronDown, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFetcher, useSearchParams } from "react-router";
import { setStoredFilters } from "~/hooks/useFilterStorage";
import { TIME_OPTIONS } from "~/utils/timeRange";
import styles from "./PresetFilterItem.module.css";

// The filter params a view captures (search query excluded).
const PRESET_KEYS = [
	"time",
	"service",
	"list",
	"minShares",
	"reposts",
	"sort",
] as const;

type PresetConfig = Partial<Record<(typeof PRESET_KEYS)[number], string>>;

/** Build a preset config from the currently active URL params. */
const configFromParams = (params: URLSearchParams): PresetConfig => {
	const config: PresetConfig = {};
	for (const key of PRESET_KEYS) {
		const value = params.get(key);
		if (value) config[key] = value;
	}
	return config;
};

/** True when the live params match this preset for every captured key. */
const isActivePreset = (
	config: PresetConfig,
	params: URLSearchParams,
): boolean =>
	PRESET_KEYS.every((key) => (config[key] ?? "") === (params.get(key) ?? ""));

// Built-in sort views everyone gets. They only set the sort (keeping any filters
// layered on top): "Most popular" is the default, "Newest" flips it.
const BUILT_IN_VIEWS: { id: string; name: string; sort: string }[] = [
	{ id: "view-popular", name: "Most popular", sort: "" },
	{ id: "view-newest", name: "Newest", sort: "newest" },
];

/**
 * A plain-language summary of a view's filters, e.g.
 * "Newest · 5+ shares · Bluesky", so a saved view reads clearly even when the
 * name is vague, and the save dialog can show exactly what's being saved.
 */
const summarizeConfig = (
	config: PresetConfig,
	lists: { id: string; name: string }[],
): string => {
	const parts: string[] = [];
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

interface FilterPresetsProps {
	presets: Pick<FilterPreset, "id" | "name" | "filters">[];
	lists: { id: string; name: string }[];
	// The save dialog is opened from the Filters panel, so its open state is
	// owned by the parent.
	saveOpen: boolean;
	onSaveOpenChange: (open: boolean) => void;
}

const FilterPresets = ({
	presets,
	lists,
	saveOpen,
	onSaveOpenChange,
}: FilterPresetsProps) => {
	const [searchParams, setSearchParams] = useSearchParams();
	// Presets refresh via the mutation action's returned list so the (streaming)
	// feed never has to reload; fall back to the loader-provided list.
	const mutation = useFetcher<{ presets?: typeof presets; error?: string }>();
	const list = mutation.data?.presets ?? presets;

	const activeConfig = configFromParams(searchParams);
	const currentSort = searchParams.get("sort") ?? "";
	// A saved preset is active only on a full match. The built-in views match on
	// sort alone, so the chip keeps showing "Newest" while filters are layered on.
	const savedMatch = list.find((p) =>
		isActivePreset(p.filters as PresetConfig, searchParams),
	);
	const active =
		savedMatch ?? BUILT_IN_VIEWS.find((v) => v.sort === currentSort);

	const [name, setName] = useState("");

	// A descriptive default name from the filters (e.g. "Newest, 5+ shares"), so a
	// saved view reads clearly in the single-line Views list even if untouched.
	const suggestedName = summarizeConfig(configFromParams(searchParams), lists)
		.split(" · ")
		.join(", ")
		.slice(0, 60);

	// Prefill the name when the dialog opens; user edits are respected afterward.
	useEffect(() => {
		if (saveOpen) setName((n) => n || suggestedName);
	}, [saveOpen, suggestedName]);

	// Close the save dialog once a create succeeds (no error came back).
	const submitting = mutation.state !== "idle";
	const prevSubmitting = useRef(submitting);
	useEffect(() => {
		if (prevSubmitting.current && !submitting && !mutation.data?.error) {
			onSaveOpenChange(false);
			setName("");
		}
		prevSubmitting.current = submitting;
	}, [submitting, mutation.data, onSaveOpenChange]);

	const applyPreset = (config: PresetConfig) => {
		// Applying a view replaces the filter state, so remember exactly this set
		// (an empty config clears storage, keeping "Most popular" across reloads).
		setStoredFilters(config);
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			for (const key of PRESET_KEYS) {
				const value = config[key];
				if (value) next.set(key, value);
				else next.delete(key);
			}
			// A different filter set means paging restarts.
			next.delete("page");
			return next;
		});
	};

	// Selecting a built-in sort view. Leaving a saved preset resets to a clean
	// sort (its filters are wiped); on an ad-hoc state, switching sort keeps the
	// current filters in place.
	const applySort = (sortValue: string) => {
		const sort = sortValue || undefined;
		applyPreset(savedMatch ? { sort } : { ...activeConfig, sort });
	};

	const savePreset = () => {
		const trimmed = name.trim();
		if (!trimmed) return;
		mutation.submit(
			{
				intent: "create",
				name: trimmed,
				filters: JSON.stringify(activeConfig),
			},
			{ method: "post", action: "/api/filter-presets" },
		);
	};

	const deletePreset = (id: string) => {
		mutation.submit(
			{ intent: "delete", id },
			{ method: "post", action: "/api/filter-presets" },
		);
	};

	return (
		<>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					<button
						type="button"
						className={`${styles.item} ${styles.chip}`}
						style={{ maxWidth: 180 }}
					>
						<Flex align="center" gap="2" style={{ minWidth: 0 }}>
							<Text truncate>{active ? active.name : "Views"}</Text>
							<ChevronDown
								width={14}
								height={14}
								style={{ opacity: 0.5, flexShrink: 0 }}
							/>
						</Flex>
					</button>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					{BUILT_IN_VIEWS.map((view) => {
						const isActive = !savedMatch && view.sort === currentSort;
						return (
							<DropdownMenu.Item
								key={view.id}
								onSelect={() => applySort(view.sort)}
							>
								<Flex align="center" gap="2">
									{isActive ? (
										<Check size={14} style={{ flexShrink: 0 }} />
									) : (
										<span style={{ width: 14, flexShrink: 0 }} />
									)}
									<Text>{view.name}</Text>
								</Flex>
							</DropdownMenu.Item>
						);
					})}

					{list.length > 0 && <DropdownMenu.Separator />}
					{list.map((preset) => {
						const config = preset.filters as PresetConfig;
						const isActive = isActivePreset(config, searchParams);
						return (
							<DropdownMenu.Item
								key={preset.id}
								onSelect={() => applyPreset(config)}
							>
								<Flex align="center" justify="between" gap="3" width="100%">
									<Flex align="center" gap="2" style={{ minWidth: 0 }}>
										{isActive ? (
											<Check size={14} style={{ flexShrink: 0 }} />
										) : (
											<span style={{ width: 14, flexShrink: 0 }} />
										)}
										<Text truncate>{preset.name}</Text>
									</Flex>
									<IconButton
										size="1"
										variant="ghost"
										aria-label={`Delete view ${preset.name}`}
										// Inherit the row's text color so the X flips to dark on the
										// highlighted row instead of staying gray on yellow.
										style={{ color: "inherit", opacity: 0.7 }}
										onClick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											deletePreset(preset.id);
										}}
									>
										<X size={14} />
									</IconButton>
								</Flex>
							</DropdownMenu.Item>
						);
					})}
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<Dialog.Root open={saveOpen} onOpenChange={onSaveOpenChange}>
				<Dialog.Content maxWidth="360px">
					<Dialog.Title size="3">Save view</Dialog.Title>
					<Dialog.Description size="2" color="gray" mb="3">
						Name this view so you can reapply it in one tap. We've suggested a
						name from your filters.
					</Dialog.Description>
					<TextField.Root
						value={name}
						maxLength={60}
						placeholder="Name this view"
						onChange={(e) => setName(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								savePreset();
							}
						}}
					/>
					{mutation.data?.error && (
						<Text as="p" size="1" color="red" mt="2">
							{mutation.data.error}
						</Text>
					)}
					<Flex justify="end" gap="2" mt="4">
						<Dialog.Close>
							<Button variant="soft" color="gray">
								Cancel
							</Button>
						</Dialog.Close>
						<Button onClick={savePreset} disabled={submitting || !name.trim()}>
							{submitting ? <Spinner size="1" /> : "Save"}
						</Button>
					</Flex>
				</Dialog.Content>
			</Dialog.Root>
		</>
	);
};

export default FilterPresets;
