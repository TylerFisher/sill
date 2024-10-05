import FilterButton from "./FilterButton";
import { Flex, Heading } from "@radix-ui/themes";

export interface ButtonProps {
	value: string;
	label: string;
}

interface FilterButtonGroupProps {
	buttonData: ButtonProps[];
	setter: (param: string, value: string) => void;
	param: string;
	variantCheck: string;
	heading: string;
}

const FilterButtonGroup = ({
	buttonData,
	setter,
	param,
	variantCheck,
	heading,
}: FilterButtonGroupProps) => {
	return (
		<>
			<Heading mb="2">{heading}</Heading>
			<Flex gap="3">
				{buttonData.map((button) => (
					<FilterButton
						key={button.value}
						param={param}
						value={button.value}
						setter={setter}
						label={button.label}
						variant={variantCheck === button.value ? "solid" : "outline"}
					/>
				))}
			</Flex>
		</>
	);
};

export default FilterButtonGroup;
