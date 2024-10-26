import type React from "react";
import { useId } from "react";
import { Box, Flex, Text, TextField } from "@radix-ui/themes";

interface FieldProps {
	labelProps: React.LabelHTMLAttributes<HTMLLabelElement>;
	inputProps: TextField.RootProps & React.InputHTMLAttributes<HTMLInputElement>;
	errors?: ListOfErrors;
}

export type ListOfErrors = Array<string | null | undefined> | null | undefined;

const TextInput = ({ labelProps, inputProps, errors }: FieldProps) => {
	const fallbackId = useId();
	const id = inputProps.id ?? fallbackId;
	const errorId = errors?.length ? `${id}-error` : undefined;
	return (
		<Box mb="5">
			<Flex mb="1">
				{/* biome-ignore lint/a11y/noLabelWithoutControl: will be used in a form elsewhere */}
				<label {...labelProps}>
					<Text size="3" weight="bold">
						{labelProps.children}
					</Text>
				</label>
			</Flex>
			<TextField.Root
				{...inputProps}
				aria-invalid={errorId ? true : undefined}
				aria-describedby={errorId}
				size="3"
			>
				<TextField.Slot />
			</TextField.Root>
			{errorId && <Text size="1">{errors}</Text>}
		</Box>
	);
};

export default TextInput;
