import {
	Card,
	Heading,
	Text,
	Badge,
	Button,
	TextField,
	Callout,
} from "@radix-ui/themes";
import { Form } from "@remix-run/react";
import { CircleAlert } from "lucide-react";
import type { blueskyAccount } from "~/drizzle/schema.server";

interface BlueskyConnectFormProps {
	account: typeof blueskyAccount.$inferSelect | null;
	searchParams: URLSearchParams;
}

const BlueskyConnectForm = ({
	account,
	searchParams,
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
						<Button color="red" type="submit">
							Disconnect
						</Button>
					</Form>
				</>
			) : (
				<Form action="/bluesky/auth" method="GET">
					<TextField.Root
						name="handle"
						placeholder="Enter your Bluesky handle (e.g. tyler.bsky.social)"
						required
						mb="3"
					>
						<TextField.Slot>@</TextField.Slot>
					</TextField.Root>
					<Button type="submit">Connect</Button>
					{searchParams.get("error") === "resolver" && (
						<Callout.Root mt="4">
							<Callout.Icon>
								<CircleAlert width="18" height="18" />
							</Callout.Icon>
							<Callout.Text>
								We couldn't find a Bluesky account with that handle. Please try
								again.
							</Callout.Text>
						</Callout.Root>
					)}
				</Form>
			)}
		</Card>
	);
};

export default BlueskyConnectForm;