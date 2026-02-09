import { useSearchParams } from "react-router";
import { useFilterStorage } from "~/hooks/useFilterStorage";
import styles from "./PresetFilterItem.module.css";

const SortPresetList = () => {
	const [searchParams, setSearchParams] = useSearchParams();
	const { clearFilterFromStorage } = useFilterStorage();

	const sort = searchParams.get("sort");

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

	return (
		<div className={styles.mobileOnly}>
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
		</div>
	);
};

export default SortPresetList;
