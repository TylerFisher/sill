import type { ButtonProps } from "@radix-ui/themes";
import { RadioCards, Spinner } from "@radix-ui/themes";
import { useLocation, useNavigation } from "react-router";
interface FilterButtonProps {
	param: string;
	value: string;
	setter: (param: string, value: string) => void;
	label: string;
}

const FilterButton = ({
	param,
	value,
	setter,
	label,
}: ButtonProps &
	React.RefAttributes<HTMLButtonElement> &
	FilterButtonProps) => {
	const navigation = useNavigation();
	const location = useLocation();

	const oldParams = new URLSearchParams(location.search);
	const newParams = new URLSearchParams(navigation.location?.search);

	const buttonSelected =
		oldParams.get(param) !== newParams.get(param) &&
		newParams.get(param) === value;

	return (
		<RadioCards.Item onClick={() => setter(param, value)} value={value}>
			{navigation.state === "loading" && buttonSelected && <Spinner size="1" />}
			{label}
		</RadioCards.Item>
	);
};

export default FilterButton;
