import { Spinner, Button, type ButtonProps } from "@radix-ui/themes";
import { useNavigation } from "react-router";

interface SubmitButtonProps extends ButtonProps {
	label: string;
}

const SubmitButton = (props: SubmitButtonProps) => {
	const { label } = props;
	const navigation = useNavigation();
	const isSubmitting =
		navigation.state === "submitting" || navigation.state === "loading";
	return (
		<Button type="submit" disabled={isSubmitting} {...props}>
			{isSubmitting ? <Spinner size="1" /> : null}
			{label}
		</Button>
	);
};

export default SubmitButton;
