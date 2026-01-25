import { Box, Flex, Text } from "@radix-ui/themes";
import type { Step } from "./types";

interface StepIndicatorProps {
	currentStep: number;
	steps: Step[];
}

export default function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
	return (
		<Flex gap="2" align="center" mb="4">
			{steps.map((step, i) => (
				<Box
					key={step.id}
					style={{
						width: "8px",
						height: "8px",
						borderRadius: "50%",
						backgroundColor:
							i === currentStep ? "var(--accent-9)" : "var(--gray-6)",
					}}
				/>
			))}
			<Text size="2" color="gray" ml="2">
				Step {currentStep + 1} of {steps.length}
			</Text>
		</Flex>
	);
}
