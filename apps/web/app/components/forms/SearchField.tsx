import { Button, TextField } from "@radix-ui/themes";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useFilterStorage } from "~/hooks/useFilterStorage";

const SearchField = () => {
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
			size="3"
			onChange={(event) => setQuery(event.target.value)}
			onKeyDown={(event) => {
				if (event.key === "Enter") {
					handleSubmit(event);
				}
			}}
		>
			<TextField.Slot>
				<Search height="16" width="16" />
			</TextField.Slot>
			{query && (
				<TextField.Slot>
					<X
						width="18"
						height="18"
						cursor="pointer"
						onClick={() => setSearchParam("query", "")}
					/>
				</TextField.Slot>
			)}
			<TextField.Slot>
				<Button
					type="button"
					variant="ghost"
					style={{
						marginRight: "1px",
					}}
					onClick={handleSubmit}
				>
					Search
				</Button>
			</TextField.Slot>
		</TextField.Root>
	);
};

export default SearchField;
