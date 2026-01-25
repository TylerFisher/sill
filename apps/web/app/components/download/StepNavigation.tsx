import { Button, Flex } from "@radix-ui/themes";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NavLink } from "react-router";

interface StepNavigationProps {
	currentStep: number;
	totalSteps: number;
	showSkip: boolean;
	onBack: () => void;
	onNext: () => void;
}

export default function StepNavigation({
	currentStep,
	totalSteps,
	showSkip,
	onBack,
	onNext,
}: StepNavigationProps) {
	const isFirstStep = currentStep === 0;
	const isLastStep = currentStep === totalSteps - 1;

	return (
		<Flex justify="between" mt="4">
			<Button variant="soft" onClick={onBack} disabled={isFirstStep}>
				<ChevronLeft size={16} />
				Back
			</Button>
			{isLastStep ? (
				<Button asChild variant="solid">
					<NavLink to="/links">Finish</NavLink>
				</Button>
			) : (
				<Button variant="solid" onClick={onNext}>
					{showSkip ? "Skip" : "Next"}
					<ChevronRight size={16} />
				</Button>
			)}
		</Flex>
	);
}
