import { Button } from "@radix-ui/themes";
import type { ButtonProps } from "@radix-ui/themes";
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
	variant,
}: ButtonProps &
	React.RefAttributes<HTMLButtonElement> &
	FilterButtonProps) => {
	return (
		<Button onClick={() => setter(param, value)} variant={variant}>
			{label}
		</Button>
	);
};

export default FilterButton;
