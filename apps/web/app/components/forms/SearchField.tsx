import { Button, TextField } from "@radix-ui/themes";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useFilterStorage } from "~/hooks/useFilterStorage";

const SearchField = ({
	rounded = false,
	hideSubmitButton = false,
}: {
	rounded?: boolean;
	// Drop the redundant "Search" button where the field is labeled (the sidebar);
	// Enter still submits.
	hideSubmitButton?: boolean;
}) => {
	const [searchParams, setSearchParams] = useSearchParams();
	const [query, setQuery] = useState(searchParams.get("query") || "");
	const { saveFiltersToStorage } = useFilterStorage();

	// Sync local state when URL parameters change
	useEffect(() => {
		const urlQuery = searchParams.get("query") || "";
		setQuery(urlQuery);
	}, [searchParams]);

	function setSearchParam(param: string, value: string) {
		setQuery(value);
		setSearchParams((prev) => {
			value ? prev.set(param, value) : prev.delete(param);
			return prev;
		});

		// Update local storage when query is cleared
		if (!value) {
			const currentFilters = {
				time: searchParams.get("time") || undefined,
				reposts: searchParams.get("reposts") || undefined,
				sort: searchParams.get("sort") || undefined,
				service: searchParams.get("service") || undefined,
				list: searchParams.get("list") || undefined,
				query: undefined,
				minShares: searchParams.get("minShares") || undefined,
			};
			saveFiltersToStorage(currentFilters);
		}
	}

	function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setSearchParam("query", query);
	}

	return (
		<TextField.Root
			name="query"
			type="text"
			value={query}
			aria-label="Search"
			size="2"
			variant="soft"
			color="gray"
			// In the bar, match the chips: a lighter fill with a real 1px border and
			// --radius-2. In the sidebar (`rounded`), match the soft pill dropdowns —
			// native soft fill, no border, fully rounded.
			style={
				rounded
					? { borderRadius: "var(--radius-full)" }
					: {
							borderRadius: "var(--radius-2)",
							backgroundColor: "var(--gray-a2)",
							border: "1px solid var(--gray-a5)",
						}
			}
			onChange={(event) => setQuery(event.target.value)}
			onKeyDown={(event) => {
				if (event.key === "Enter") {
					handleSubmit(event);
				}
			}}
		>
			<TextField.Slot>
				<Search height="16" width="16" color="var(--gray-11)" />
			</TextField.Slot>
			{query && (
				<TextField.Slot>
					<X
						width="18"
						height="18"
						color="var(--gray-11)"
						cursor="pointer"
						onClick={() => setSearchParam("query", "")}
					/>
				</TextField.Slot>
			)}
			{!hideSubmitButton && (
				<TextField.Slot>
					<Button
						type="button"
						variant="ghost"
						color="gray"
						style={{
							marginRight: "1px",
							color: "var(--gray-11)",
						}}
						onClick={handleSubmit}
					>
						Search
					</Button>
				</TextField.Slot>
			)}
		</TextField.Root>
	);
};

export default SearchField;
