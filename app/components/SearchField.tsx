import { Button, TextField } from "@radix-ui/themes";
import { useSearchParams } from "@remix-run/react";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";

const SearchField = () => {
	const [searchParams] = useSearchParams();

	return (
		<TextField.Root
			name="query"
			type="text"
			defaultValue={searchParams.get("query") || ""}
		>
			<TextField.Slot>
				<MagnifyingGlassIcon height="16" width="16" />
			</TextField.Slot>
			<TextField.Slot>
				<Button type="submit" variant="ghost">
					Search
				</Button>
			</TextField.Slot>
		</TextField.Root>
	);
};

export default SearchField;
