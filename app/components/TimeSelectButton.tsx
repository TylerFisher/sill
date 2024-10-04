import { Button } from "@radix-ui/themes";
import type { ButtonProps } from "@radix-ui/themes";
interface TimeSelectButtonProps {
	time: string;
	setter: (arg0: string) => void;
	label: string;
}

const TimeSelectButton = ({
	time,
	setter,
	label,
	variant,
}: ButtonProps &
	React.RefAttributes<HTMLButtonElement> &
	TimeSelectButtonProps) => {
	return (
		<Button onClick={() => setter(time)} variant={variant}>
			{label}
		</Button>
	);
};

export default TimeSelectButton;
