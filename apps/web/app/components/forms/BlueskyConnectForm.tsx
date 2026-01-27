import { Badge, Card, Heading, Text } from "@radix-ui/themes";
import { Form } from "react-router";
import type { blueskyAccount, SubscriptionStatus } from "@sill/schema";
import BlueskyAuthForm from "./BlueskyAuthForm";
import type { ListOption } from "./ListSwitch";
import Lists from "./Lists";
import SubmitButton from "./SubmitButton";

interface BlueskyConnectFormProps {
	account: typeof blueskyAccount.$inferSelect | null;
	searchParams: URLSearchParams;
	listOptions: ListOption[];
	subscribed: SubscriptionStatus;
	loading?: boolean;
}

const BlueskyConnectForm = ({
	account,
	searchParams,
	listOptions,
	subscribed,
	loading = false,
}: BlueskyConnectFormProps) => {
	return (
		<Card mb="6">
			<Heading size="5" mb="1">
				Bluesky
			</Heading>
			{account ? (
				<>
					<Text size="2" as="p" mb="3">
						You are connected to <Badge>{account.handle}</Badge>.
					</Text>
					<Form action="/bluesky/auth/revoke" method="post">
						<SubmitButton label="Disconnect" color="red" size="2" />
					</Form>
					<Lists
						listOptions={listOptions}
						account={account}
						subscribed={subscribed}
						loading={loading}
					/>
				</>
			) : (
				<BlueskyAuthForm mode="connect" searchParams={searchParams} />
			)}
		</Card>
	);
};

export default BlueskyConnectForm;
