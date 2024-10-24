import type { ButtonProps } from "@radix-ui/themes";
import { RadioCards } from "@radix-ui/themes";
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
	return (
		<RadioCards.Item onClick={() => setter(param, value)} value={value}>
			{label}
		</RadioCards.Item>
	);
};

export default FilterButton;
