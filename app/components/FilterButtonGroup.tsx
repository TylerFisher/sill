import FilterButton from "./FilterButton";
import { RadioCards } from "@radix-ui/themes";
import { Box, Flex, Heading } from "@radix-ui/themes";

export interface ButtonGroup {
	heading: string;
	defaultValue: string;
	param: string;
	buttons: ButtonProps[];
}

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
		<Box mb="4">
			<Heading
				mb="1"
				size="1"
				as="h5"
				style={{
					textTransform: "uppercase",
				}}
			>
				{heading}
			</Heading>
			<RadioCards.Root defaultValue={variantCheck} size="1">
				<Flex gap="3">
					{buttonData.map((button) => (
						<FilterButton
							key={button.value}
							param={param}
							value={button.value}
							setter={setter}
							label={button.label}
						/>
					))}
				</Flex>
			</RadioCards.Root>
		</Box>
	);
};

export default FilterButtonGroup;
