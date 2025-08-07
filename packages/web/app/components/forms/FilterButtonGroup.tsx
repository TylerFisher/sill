import { Flex, Select, Spinner } from "@radix-ui/themes";
import { Box, Heading } from "@radix-ui/themes";
import { useLocation, useNavigation, useSearchParams } from "react-router";
import styles from "./FilterButtonGroup.module.css";
import FilterCustomIndicator from "./FilterCustomIndicator";

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
	defaultValue: string;
	heading: string;
	isCustomized?: boolean;
}

const FilterButtonGroup = ({
	buttonData,
	setter,
	param,
	defaultValue,
	heading,
	isCustomized = false,
}: FilterButtonGroupProps) => {
	const [searchParams] = useSearchParams();
	const searchParam = searchParams.get(param);
	const navigation = useNavigation();
	const location = useLocation();

	const oldParams = new URLSearchParams(location.search);
	const newParams = new URLSearchParams(navigation.location?.search);

	const buttonSelected =
		oldParams.get(param) !== newParams.get(param) &&
		newParams.get(param) === defaultValue;

	const onSelected = (value: string) => {
		setter(param, value);
	};

	return (
		<Box mb="4">
			<Flex align="center" gap="1" mb="1">
				<Heading size="1" as="h5" className={styles["filter-heading"]}>
					{heading}
				</Heading>
				<FilterCustomIndicator isVisible={isCustomized} />
			</Flex>

			<Select.Root
				value={searchParam || defaultValue}
				onValueChange={onSelected}
				size={{
					initial: "3",
					sm: "2",
				}}
			>
				{navigation.state === "loading" && buttonSelected ? (
					<Select.Trigger>
						<Spinner size="1" />
					</Select.Trigger>
				) : (
					<Select.Trigger placeholder={heading} />
				)}
				<Select.Content>
					{buttonData.map((button) => (
						<Select.Item key={button.value} value={button.value}>
							{button.label}
						</Select.Item>
					))}
				</Select.Content>
			</Select.Root>
		</Box>
	);
};

export default FilterButtonGroup;
