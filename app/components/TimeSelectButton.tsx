import { Button } from "@radix-ui/themes";

interface TimeSelectButtonProps {
	color:
		| "gray"
		| "gold"
		| "bronze"
		| "brown"
		| "yellow"
		| "amber"
		| "orange"
		| "tomato"
		| "red"
		| "ruby"
		| "crimson"
		| "pink"
		| "plum"
		| "purple"
		| "violet"
		| "iris"
		| "indigo"
		| "blue"
		| "cyan"
		| "teal"
		| "jade"
		| "green"
		| "grass"
		| "lime"
		| "mint"
		| "sky";
	time: string;
	setter: (arg0: string) => void;
	label: string;
}

const TimeSelectButton = ({
	color,
	time,
	setter,
	label,
}: TimeSelectButtonProps) => {
	return (
		<Button onClick={() => setter(time)} color={color}>
			{label}
		</Button>
	);
};

export default TimeSelectButton;
