import { Box, Flex, Heading, Spinner, Text } from "@radix-ui/themes";
import { Suspense, useEffect, useState } from "react";
import { Await } from "react-router";
import AccountsStep from "./AccountsStep";
import EmailStep from "./EmailStep";
import ListsStep from "./ListsStep";
import StepIndicator from "./StepIndicator";
import StepNavigation from "./StepNavigation";
import { STEPS, type WelcomeContentProps } from "./types";

export default function WelcomeContent({
	searchParams,
	user,
	digestSettingsPromise,
	subscribed,
}: WelcomeContentProps) {
	const [currentStep, setCurrentStep] = useState(0);
	const blueskyAccount = user.blueskyAccounts[0] || null;
	const mastodonAccount = user.mastodonAccounts[0] || null;
	const currentStepData = STEPS[currentStep];

	// Auto-advance to step 2 when both accounts are connected
	useEffect(() => {
		if (currentStep === 0 && blueskyAccount && mastodonAccount) {
			setCurrentStep(1);
		}
	}, [currentStep, blueskyAccount, mastodonAccount]);

	return (
		<Box maxWidth="600px">
			<StepIndicator currentStep={currentStep} steps={STEPS} />

			<Box mb="4">
				<Heading as="h2" size="6" mb="1">
					{currentStepData.title}
				</Heading>
				<Text color="gray" size="2">
					{currentStepData.description}
				</Text>
			</Box>

			<Box
				py="4"
				style={{
					borderTop: "1px solid var(--gray-6)",
					borderBottom: "1px solid var(--gray-6)",
					minHeight: "250px",
				}}
			>
				{currentStep === 0 && (
					<AccountsStep
						blueskyAccount={blueskyAccount}
						mastodonAccount={mastodonAccount}
						searchParams={searchParams}
					/>
				)}
				{currentStep === 1 && (
					<ListsStep
						blueskyAccount={blueskyAccount}
						mastodonAccount={mastodonAccount}
						subscribed={subscribed}
					/>
				)}
				{currentStep === 2 && (
					<Suspense
						fallback={
							<Flex align="center" gap="2">
								<Spinner />
								<Text size="2">Loading...</Text>
							</Flex>
						}
					>
						<Await resolve={digestSettingsPromise}>
							{(digestData) => (
								<EmailStep
									email={user.email}
									currentSettings={digestData.settings}
								/>
							)}
						</Await>
					</Suspense>
				)}
			</Box>

			<StepNavigation
				currentStep={currentStep}
				totalSteps={STEPS.length}
				showSkip={currentStep === 2 && !user.email}
				onBack={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
				onNext={() =>
					setCurrentStep((prev) => Math.min(STEPS.length - 1, prev + 1))
				}
			/>
		</Box>
	);
}
