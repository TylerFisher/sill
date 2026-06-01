import { DropdownMenu, Spinner } from "@radix-ui/themes";
import type { list } from "@sill/schema";
import { ChevronDown } from "lucide-react";
import { useNavigation, useSearchParams } from "react-router";
import { useFilterStorage } from "~/hooks/useFilterStorage";
import styles from "./PresetFilterItem.module.css";

interface TimeOption {
	value: string;
	label: string;
}

interface FilterPresetListProps {
	showService: boolean;
	lists: (typeof list.$inferSelect)[];
	hideSort?: boolean;
	/** Override the time-window options (e.g. wider ranges for discovery pages). */
	timeOptions?: TimeOption[];
}

const DEFAULT_TIME_OPTIONS: TimeOption[] = [
	{ value: "3h", label: "3 hours" },
	{ value: "6h", label: "6 hours" },
	{ value: "12h", label: "12 hours" },
	{ value: "", label: "24 hours" },
];

const repostOptions = [
	{ value: "", label: "With reposts" },
	{ value: "exclude", label: "No reposts" },
	{ value: "only", label: "Reposts only" },
];

const sharesOptions = [
	{ value: "", label: "1+" },
	{ value: "2", label: "2+" },
	{ value: "3", label: "3+" },
	{ value: "5", label: "5+" },
	{ value: "10", label: "10+" },
];

const FilterPresetList = ({
	showService,
	lists,
	hideSort = false,
	timeOptions = DEFAULT_TIME_OPTIONS,
}: FilterPresetListProps) => {
	const [searchParams, setSearchParams] = useSearchParams();
	const { clearFilterFromStorage } = useFilterStorage();
	const navigation = useNavigation();

	// While a filter navigation is in flight, reflect the target params
	// optimistically and flag the control whose value is changing as pending.
	const pendingParams =
		navigation.state === "loading" && navigation.location
			? new URLSearchParams(navigation.location.search)
			: null;
	const params = pendingParams ?? searchParams;
	const paramChanging = (key: string) =>
		pendingParams !== null &&
		(pendingParams.get(key) ?? "") !== (searchParams.get(key) ?? "");

	const sort = params.get("sort");
	const time = params.get("time") || "";
	const reposts = params.get("reposts") || "";
	const minShares = params.get("minShares") || "";
	const activeService = params.get("service");
	const activeList = params.get("list");
	// Selecting a service/list can change either param, so the "From" group is
	// pending if either is in flight.
	const fromChanging = paramChanging("service") || paramChanging("list");

	const handleSelectSort = (value: string) => {
		setSearchParams((prev) => {
			if (value === "") {
				prev.delete("sort");
			} else {
				prev.set("sort", value);
			}
			return prev;
		});

		if (value === "") {
			clearFilterFromStorage("sort");
		}
	};

	const handleSelectTime = (value: string) => {
		setSearchParams((prev) => {
			if (value === "") {
				prev.delete("time");
			} else {
				prev.set("time", value);
			}
			return prev;
		});

		if (value === "") {
			clearFilterFromStorage("time");
		}
	};

	const handleSelectReposts = (value: string) => {
		setSearchParams((prev) => {
			if (value === "") {
				prev.delete("reposts");
			} else {
				prev.set("reposts", value);
			}
			return prev;
		});

		if (value === "") {
			clearFilterFromStorage("reposts");
		}
	};

	const handleSelectShares = (value: string) => {
		setSearchParams((prev) => {
			if (value === "") {
				prev.delete("minShares");
			} else {
				prev.set("minShares", value);
			}
			return prev;
		});

		if (value === "") {
			clearFilterFromStorage("minShares");
		}
	};

	const handleSelectService = (service: string) => {
		setSearchParams((prev) => {
			prev.delete("list");
			if (service === "all") {
				prev.delete("service");
			} else {
				prev.set("service", service);
			}
			return prev;
		});

		if (service === "all") {
			clearFilterFromStorage("service");
			clearFilterFromStorage("list");
		}
	};

	const handleSelectList = (listId: string) => {
		setSearchParams((prev) => {
			prev.delete("service");
			if (listId === "all") {
				prev.delete("list");
			} else {
				prev.set("list", listId);
			}
			return prev;
		});

		if (listId === "all") {
			clearFilterFromStorage("service");
			clearFilterFromStorage("list");
		}
	};

	const getTimeLabel = () => {
		const option = timeOptions.find((o) => o.value === time);
		return option?.label || "24 hours";
	};

	const getRepostsLabel = () => {
		const option = repostOptions.find((o) => o.value === reposts);
		return option?.label || "With reposts";
	};

	const getSharesLabel = () => {
		const option = sharesOptions.find((o) => o.value === minShares);
		return option?.label || "1+";
	};

	return (
		<div className={styles.list}>
			{!hideSort && (
				<>
					<span className={styles.label}>Sort</span>
					<button
						type="button"
						onClick={() => handleSelectSort("")}
						className={`${styles.item} ${sort !== "newest" ? styles.active : ""}`}
					>
						Most popular
						{paramChanging("sort") && sort !== "newest" && <Spinner size="1" />}
					</button>
					<button
						type="button"
						onClick={() => handleSelectSort("newest")}
						className={`${styles.item} ${sort === "newest" ? styles.active : ""}`}
					>
						Newest
						{paramChanging("sort") && sort === "newest" && <Spinner size="1" />}
					</button>
				</>
			)}

			<span className={styles.label}>Filter</span>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					<button
						type="button"
						className={`${styles.item} ${time ? styles.active : ""}`}
					>
						<span>{getTimeLabel()}</span>
						{paramChanging("time") ? (
							<Spinner size="1" />
						) : (
							<ChevronDown className={styles.chevron} width={14} height={14} />
						)}
					</button>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					{timeOptions.map((option) => (
						<DropdownMenu.Item
							key={option.value}
							onSelect={() => handleSelectTime(option.value)}
						>
							{option.label}
						</DropdownMenu.Item>
					))}
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					<button
						type="button"
						className={`${styles.item} ${minShares ? styles.active : ""}`}
					>
						<span>{getSharesLabel()} shares</span>
						{paramChanging("minShares") ? (
							<Spinner size="1" />
						) : (
							<ChevronDown className={styles.chevron} width={14} height={14} />
						)}
					</button>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					{sharesOptions.map((option) => (
						<DropdownMenu.Item
							key={option.value}
							onSelect={() => handleSelectShares(option.value)}
						>
							{option.label} shares
						</DropdownMenu.Item>
					))}
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					<button
						type="button"
						className={`${styles.item} ${styles.fullWidth} ${reposts ? styles.active : ""}`}
					>
						<span>{getRepostsLabel()}</span>
						{paramChanging("reposts") ? (
							<Spinner size="1" />
						) : (
							<ChevronDown className={styles.chevron} width={14} height={14} />
						)}
					</button>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					{repostOptions.map((option) => (
						<DropdownMenu.Item
							key={option.value}
							onSelect={() => handleSelectReposts(option.value)}
						>
							{option.label}
						</DropdownMenu.Item>
					))}
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			{(showService || lists.length > 0) && (
				<>
					<span className={styles.label}>From</span>
					<button
						type="button"
						onClick={() => handleSelectService("all")}
						className={`${styles.item} ${styles.fullWidth} ${!activeService && !activeList ? styles.active : ""}`}
					>
						All
						{fromChanging && !activeService && !activeList && (
							<Spinner size="1" />
						)}
					</button>
					{showService && (
						<>
							<button
								type="button"
								onClick={() => handleSelectService("bluesky")}
								className={`${styles.item} ${activeService === "bluesky" ? styles.active : ""}`}
							>
								Bluesky
								{fromChanging && activeService === "bluesky" && (
									<Spinner size="1" />
								)}
							</button>
							<button
								type="button"
								onClick={() => handleSelectService("mastodon")}
								className={`${styles.item} ${activeService === "mastodon" ? styles.active : ""}`}
							>
								Mastodon
								{fromChanging && activeService === "mastodon" && (
									<Spinner size="1" />
								)}
							</button>
						</>
					)}
					{[...lists]
						.sort((a, b) => a.name.localeCompare(b.name))
						.map((list) => {
							const isActive = activeList === list.id;
							return (
								<button
									key={list.id}
									type="button"
									onClick={() => handleSelectList(list.id)}
									className={`${styles.item} ${isActive ? styles.active : ""}`}
								>
									{list.name}
									{fromChanging && isActive && <Spinner size="1" />}
								</button>
							);
						})}
				</>
			)}
		</div>
	);
};

export default FilterPresetList;
