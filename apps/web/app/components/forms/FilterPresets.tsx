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
import type { FilterPreset, SubscriptionStatus } from "@sill/schema";
import { Check, ChevronDown, Plus, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFetcher, useSearchParams } from "react-router";
import SillPlus from "~/components/subscription/SillPlus";
import styles from "./PresetFilterItem.module.css";

// The sidebar filter params a preset captures (search query excluded).
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

interface FilterPresetsProps {
	presets: Pick<FilterPreset, "id" | "name" | "filters">[];
	subscribed: SubscriptionStatus;
}

const FilterPresets = ({ presets, subscribed }: FilterPresetsProps) => {
	const [searchParams, setSearchParams] = useSearchParams();
	// Presets refresh via the mutation action's returned list so the (streaming)
	// feed never has to reload; fall back to the loader-provided list.
	const mutation = useFetcher<{ presets?: typeof presets; error?: string }>();
	const list = mutation.data?.presets ?? presets;

	const isPlus = subscribed === "plus";
	const activeConfig = configFromParams(searchParams);
	const active = list.find((p) =>
		isActivePreset(p.filters as PresetConfig, searchParams),
	);
	// Something to save, and it isn't already an existing preset.
	const canSave = Object.keys(activeConfig).length > 0 && !active;

	const [saveOpen, setSaveOpen] = useState(false);
	const [name, setName] = useState("");

	// Close the save dialog once a create succeeds (no error came back).
	const submitting = mutation.state !== "idle";
	const prevSubmitting = useRef(submitting);
	useEffect(() => {
		if (prevSubmitting.current && !submitting && !mutation.data?.error) {
			setSaveOpen(false);
			setName("");
		}
		prevSubmitting.current = submitting;
	}, [submitting, mutation.data]);

	const applyPreset = (config: PresetConfig) => {
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
		<div className={styles.list}>
			<span className={styles.label}>Presets</span>

			{list.length === 0 ? (
				// Nothing saved yet: skip the dropdown, just offer to save.
				isPlus ? (
					<button
						type="button"
						className={`${styles.item} ${styles.fullWidth}`}
						disabled={!canSave}
						style={{ opacity: canSave ? 1 : 0.5 }}
						onClick={() => setSaveOpen(true)}
					>
						<Flex align="center" gap="2">
							<Plus size={14} />
							<Text>Save filters</Text>
						</Flex>
					</button>
				) : (
					<button
						type="button"
						className={`${styles.item} ${styles.fullWidth}`}
						disabled
						style={{ opacity: 0.6, cursor: "default" }}
					>
						<Flex align="center" justify="between" gap="3" width="100%">
							<Flex align="center" gap="2">
								<Plus size={14} />
								<Text>Save filters</Text>
							</Flex>
							<SillPlus />
						</Flex>
					</button>
				)
			) : (
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						<button
							type="button"
							className={`${styles.item} ${styles.fullWidth} ${
								active ? styles.active : ""
							}`}
						>
							<Flex align="center" gap="2" style={{ minWidth: 0 }}>
								<SlidersHorizontal size={14} style={{ flexShrink: 0 }} />
								<Text truncate>{active ? active.name : "Saved filters"}</Text>
							</Flex>
							<ChevronDown className={styles.chevron} width={14} height={14} />
						</button>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						{list.map((preset) => {
							const isActive = isActivePreset(
								preset.filters as PresetConfig,
								searchParams,
							);
							return (
								<DropdownMenu.Item
									key={preset.id}
									onSelect={() => applyPreset(preset.filters as PresetConfig)}
								>
									<Flex align="center" justify="between" gap="3" width="100%">
										<Flex align="center" gap="2" style={{ minWidth: 0 }}>
											{isActive ? (
												<Check size={14} style={{ flexShrink: 0 }} />
											) : (
												<SlidersHorizontal
													size={14}
													style={{ flexShrink: 0 }}
												/>
											)}
											<Text truncate>{preset.name}</Text>
										</Flex>
										<IconButton
											size="1"
											variant="ghost"
											color="gray"
											aria-label={`Delete preset ${preset.name}`}
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

						<DropdownMenu.Separator />

						{isPlus ? (
							<DropdownMenu.Item
								disabled={!canSave}
								onSelect={(e) => {
									e.preventDefault();
									setSaveOpen(true);
								}}
							>
								<Flex align="center" gap="2">
									<Plus size={14} />
									<Text>Save current filters</Text>
								</Flex>
							</DropdownMenu.Item>
						) : (
							<DropdownMenu.Item disabled onSelect={(e) => e.preventDefault()}>
								<Flex align="center" justify="between" gap="3" width="100%">
									<Flex align="center" gap="2">
										<Plus size={14} />
										<Text>Save current filters</Text>
									</Flex>
									<SillPlus />
								</Flex>
							</DropdownMenu.Item>
						)}
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			)}

			<Dialog.Root open={saveOpen} onOpenChange={setSaveOpen}>
				<Dialog.Content maxWidth="360px">
					<Dialog.Title size="3">Save filters</Dialog.Title>
					<Dialog.Description size="2" color="gray" mb="3">
						Name this filter set to reuse it later.
					</Dialog.Description>
					<TextField.Root
						value={name}
						maxLength={60}
						placeholder="e.g. Bluesky, last 7 days"
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
		</div>
	);
};

export default FilterPresets;
