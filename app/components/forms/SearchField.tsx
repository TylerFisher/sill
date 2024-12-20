import { Button, TextField } from "@radix-ui/themes";
import { useSearchParams } from "react-router";
import { Search, X } from "lucide-react";
import { useState } from "react";

const SearchField = () => {
	const [searchParams, setSearchParams] = useSearchParams();
	const [query, setQuery] = useState(searchParams.get("query") || "");

	function setSearchParam(param: string, value: string) {
		setQuery(value);
		setSearchParams((prev) => {
			value ? prev.set(param, value) : prev.delete(param);
			return prev;
		});
	}

	return (
		<TextField.Root
			name="query"
			type="text"
			value={query}
			aria-label="Search"
			size="3"
			onChange={(event) => setQuery(event.target.value)}
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
					type="submit"
					variant="ghost"
					style={{
						marginRight: "1px",
					}}
				>
					Search
				</Button>
			</TextField.Slot>
		</TextField.Root>
	);
};

export default SearchField;
