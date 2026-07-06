import { DropdownMenu, Flex, Spinner } from "@radix-ui/themes";
import type { SubscriptionStatus, list } from "@sill/schema";
import { ChevronDown } from "lucide-react";
import { useNavigation, useSearchParams } from "react-router";
import SillPlus from "~/components/subscription/SillPlus";
import { useFilterStorage } from "~/hooks/useFilterStorage";
import { TIME_OPTIONS, type TimeOption } from "~/utils/timeRange";
import styles from "./PresetFilterItem.module.css";

interface FilterPresetListProps {
	showService: boolean;
	lists: (typeof list.$inferSelect)[];
	hideSort?: boolean;
	/** Override the time-window options (e.g. wider ranges for discovery pages). */
	timeOptions?: TimeOption[];
	/** Current subscription status; gates the Sill+ time windows. */
	subscribed?: SubscriptionStatus;
}

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
	timeOptions = TIME_OPTIONS,
	subscribed,
}: FilterPresetListProps) => {
	const [searchParams, setSearchParams] = useSearchParams();
	const { clearFilterFromStorage } = useFilterStorage();
	const navigation = useNavigation();
	const isPlus = subscribed === "plus";

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
	// A Sill+ window selected by a now-free user is clamped to 24h server-side,
	// so treat it as inactive in the trigger.
	const timeLocked =
		!!timeOptions.find((o) => o.value === time)?.plus && !isPlus;
	const timeActive = !!time && !timeLocked;
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
		// A free user with a saved Sill+ window is clamped server-side to 24h,
		// so reflect that in the trigger rather than showing the locked label.
		if (option?.plus && !isPlus) return "24 hours";
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
						className={`${styles.item} ${timeActive ? styles.active : ""}`}
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
					{timeOptions.map((option) => {
						const locked = !!option.plus && !isPlus;
						return (
							<DropdownMenu.Item
								key={option.value}
								disabled={locked}
								onSelect={
									locked ? undefined : () => handleSelectTime(option.value)
								}
							>
								<Flex align="center" justify="between" gap="3" width="100%">
									<span>{option.label}</span>
									{locked && <SillPlus />}
								</Flex>
							</DropdownMenu.Item>
						);
					})}
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
