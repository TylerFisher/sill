import { Button, type ButtonProps, Spinner } from "@radix-ui/themes";
import { useNavigation } from "react-router";

interface SubmitButtonProps extends ButtonProps {
	label: string;
	/**
	 * Override the submitting state. `useNavigation` only tracks page
	 * navigations, so a form that submits via `useFetcher` must pass its own
	 * `fetcher.state !== "idle"` here for the pending UI to fire.
	 */
	pending?: boolean;
}

const SubmitButton = ({ label, pending, ...buttonProps }: SubmitButtonProps) => {
	const navigation = useNavigation();
	const isSubmitting =
		pending ??
		(navigation.state === "submitting" || navigation.state === "loading");
	return (
		<Button type="submit" {...buttonProps} disabled={isSubmitting}>
			{isSubmitting ? <Spinner size="1" /> : null}
			{label}
		</Button>
	);
};

export default SubmitButton;
