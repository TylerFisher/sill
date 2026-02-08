import { DropdownMenu } from "@radix-ui/themes";
import type { list } from "@sill/schema";
import { ChevronDown } from "lucide-react";
import { useSearchParams } from "react-router";
import { useFilterStorage } from "~/hooks/useFilterStorage";
import styles from "./PresetFilterItem.module.css";

interface FilterPresetListProps {
	showService: boolean;
	lists: (typeof list.$inferSelect)[];
}

const timeOptions = [
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

const FilterPresetList = ({ showService, lists }: FilterPresetListProps) => {
	const [searchParams, setSearchParams] = useSearchParams();
	const { clearFilterFromStorage } = useFilterStorage();

	const sort = searchParams.get("sort");
	const time = searchParams.get("time") || "";
	const reposts = searchParams.get("reposts") || "";
	const minShares = searchParams.get("minShares") || "";
	const activeService = searchParams.get("service");
	const activeList = searchParams.get("list");

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
			<span className={styles.label}>Sort</span>
			<button
				type="button"
				onClick={() => handleSelectSort("")}
				className={`${styles.item} ${sort !== "newest" ? styles.active : ""}`}
			>
				Most popular
			</button>
			<button
				type="button"
				onClick={() => handleSelectSort("newest")}
				className={`${styles.item} ${sort === "newest" ? styles.active : ""}`}
			>
				Newest
			</button>

			<span className={styles.label}>Filter</span>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					<button
						type="button"
						className={`${styles.item} ${time ? styles.active : ""}`}
					>
						<span>{getTimeLabel()}</span>
						<ChevronDown className={styles.chevron} width={14} height={14} />
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
						<ChevronDown className={styles.chevron} width={14} height={14} />
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
						<ChevronDown className={styles.chevron} width={14} height={14} />
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
					</button>
					{showService && (
						<>
							<button
								type="button"
								onClick={() => handleSelectService("bluesky")}
								className={`${styles.item} ${activeService === "bluesky" ? styles.active : ""}`}
							>
								Bluesky
							</button>
							<button
								type="button"
								onClick={() => handleSelectService("mastodon")}
								className={`${styles.item} ${activeService === "mastodon" ? styles.active : ""}`}
							>
								Mastodon
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
								</button>
							);
						})}
				</>
			)}
		</div>
	);
};

export default FilterPresetList;
