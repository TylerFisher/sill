import { AlertDialog, Flex, Link } from "@radix-ui/themes";
import { Form, useFetcher } from "react-router";
import SubmitButton from "../forms/SubmitButton";

const AgreeToTerms = () => {
	const fetcher = useFetcher();
	return (
		<AlertDialog.Root defaultOpen>
			<AlertDialog.Content>
				<AlertDialog.Title>
					We've updated our terms and conditions
				</AlertDialog.Title>
				<AlertDialog.Description>
					Please read and agree to our updated{" "}
					<Link href="https://terms.sill.social/terms.html">
						terms and conditions
					</Link>{" "}
					to continue using Sill.
				</AlertDialog.Description>
				<Flex gap="3" mt="4">
					<AlertDialog.Action>
						<fetcher.Form action="/api/agree-to-terms" method="post">
							<SubmitButton label="I agree to the terms and conditions" />
						</fetcher.Form>
					</AlertDialog.Action>
				</Flex>
			</AlertDialog.Content>
		</AlertDialog.Root>
	);
};

export default AgreeToTerms;
