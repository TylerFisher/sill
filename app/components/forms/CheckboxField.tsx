import {
	Box,
	Checkbox,
	type CheckboxProps,
	Flex,
	Text,
	type TextProps,
} from "@radix-ui/themes";
import type React from "react";
import { useId } from "react";

interface CheckboxFieldProps {
	labelProps: TextProps & React.LabelHTMLAttributes<HTMLLabelElement>;
	inputProps: CheckboxProps & React.InputHTMLAttributes<HTMLInputElement>;
	errors?: ListOfErrors;
}
export type ListOfErrors = Array<string | null | undefined> | null | undefined;

const CheckboxField = ({
	labelProps,
	inputProps,
	errors,
}: CheckboxFieldProps) => {
	const fallbackId = useId();
	const id = inputProps.id ?? fallbackId;
	const errorId = errors?.length ? `${id}-error` : undefined;
	return (
		<Box>
			<Text as="label" size="2" {...labelProps}>
				<Flex gap="2">
					<Checkbox
						{...inputProps}
						aria-invalid={errorId ? true : undefined}
						aria-describedby={errorId}
					/>
					{labelProps.children}
				</Flex>
			</Text>
			<Text size="1">{errors}</Text>
		</Box>
	);
};

export default CheckboxField;
