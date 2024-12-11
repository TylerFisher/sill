import { Select, Spinner } from "@radix-ui/themes";
import { Box, Heading } from "@radix-ui/themes";
import styles from "./FilterButtonGroup.module.css";
import { useLocation, useNavigation, useSearchParams } from "@remix-run/react";

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
}

const FilterButtonGroup = ({
	buttonData,
	setter,
	param,
	defaultValue,
	heading,
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
			<Heading mb="1" size="1" as="h5" className={styles["filter-heading"]}>
				{heading}
			</Heading>

			<Select.Root
				value={searchParam || defaultValue}
				onValueChange={onSelected}
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
