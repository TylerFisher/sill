import { Callout } from "@radix-ui/themes";
import { CircleAlert } from "lucide-react";

const ErrorCallout = ({ error }: { error: string }) => {
	return (
		<Callout.Root color="red" mt="4">
			<Callout.Icon>
				<CircleAlert width="18" height="18" />
			</Callout.Icon>
			<Callout.Text>Error: {error}</Callout.Text>
		</Callout.Root>
	);
};

export default ErrorCallout;
