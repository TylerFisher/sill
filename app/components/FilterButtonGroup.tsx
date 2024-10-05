import FilterButton from "./FilterButton";
import { Box, Flex, Heading } from "@radix-ui/themes";

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
			<Flex gap="3">
				{buttonData.map((button) => (
					<FilterButton
						key={button.value}
						param={param}
						value={button.value}
						setter={setter}
						label={button.label}
						variant={variantCheck === button.value ? "solid" : "outline"}
						size="1"
					/>
				))}
			</Flex>
		</Box>
	);
};

export default FilterButtonGroup;
