import { Button, TextField } from "@radix-ui/themes";
import { useSearchParams } from "@remix-run/react";
import { Search, X } from "lucide-react";

const SearchField = () => {
	const [searchParams, setSearchParams] = useSearchParams();
	const query = searchParams.get("query") || "";

	function setSearchParam(param: string, value: string) {
		setSearchParams((prev) => {
			prev.set(param, value);
			return prev;
		});
	}

	return (
		<TextField.Root
			name="query"
			type="text"
			defaultValue={query}
			aria-label="Search"
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
				<Button type="submit" variant="ghost">
					Search
				</Button>
			</TextField.Slot>
		</TextField.Root>
	);
};

export default SearchField;
