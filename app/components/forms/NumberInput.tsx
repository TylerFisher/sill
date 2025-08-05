import { Box, Flex, Heading, TextField } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import styles from "./FilterButtonGroup.module.css";
import FilterCustomIndicator from "./FilterCustomIndicator";

interface NumberInputProps {
	param: string;
	heading: string;
	placeholder?: string;
	min?: number;
	max?: number;
	isCustomized?: boolean;
}

const NumberInput = ({
	param,
	heading,
	placeholder = "Number",
	min = 1,
	max,
	isCustomized = false,
}: NumberInputProps) => {
	const [searchParams, setSearchParams] = useSearchParams();
	const [value, setValue] = useState(searchParams.get(param) || "");

	useEffect(() => {
		setValue(searchParams.get(param) || "");
	}, [searchParams, param]);

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = event.target.value;
		setValue(newValue);

		setSearchParams((prev) => {
			if (newValue && newValue !== "") {
				const numValue = Number.parseInt(newValue);
				if (
					!Number.isNaN(numValue) &&
					numValue >= min &&
					(!max || numValue <= max)
				) {
					prev.set(param, newValue);
				}
			} else {
				prev.delete(param);
			}
			return prev;
		});
	};

	return (
		<Box mb="4">
			<Flex align="center" gap="1" mb="1">
				<Heading size="1" as="h5" className={styles["filter-heading"]}>
					{heading}
				</Heading>
				<FilterCustomIndicator isVisible={isCustomized} />
			</Flex>
			<TextField.Root
				type="number"
				value={value}
				onChange={handleChange}
				placeholder={placeholder}
				min={min}
				max={max}
				size={{
					initial: "3",
					sm: "2",
				}}
				style={{ width: "80px" }}
			/>
		</Box>
	);
};

export default NumberInput;
