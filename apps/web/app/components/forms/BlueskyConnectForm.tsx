import * as Collapsible from "@radix-ui/react-collapsible";
import {
	Badge,
	Box,
	Button,
	Callout,
	Card,
	Heading,
	Text,
	TextField,
} from "@radix-ui/themes";
import { ChevronDown, CircleAlert } from "lucide-react";
import { Form } from "react-router";
import type { blueskyAccount, SubscriptionStatus } from "@sill/schema";
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
				<Form action="/bluesky/auth" method="GET">
					<Box mt="3">
						<Text htmlFor="handle" size="2" as="label" aria-required={false}>
							Enter your Bluesky handle (e.g. username.bsky.social)
						</Text>
						<TextField.Root
							name="handle"
							placeholder="username.bsky.social"
							mb="3"
						>
							<TextField.Slot />
						</TextField.Root>
						<SubmitButton size="2" label="Connect" />
					</Box>

					{searchParams.get("error") === "resolver" && (
						<Callout.Root mt="4" color="red">
							<Callout.Icon>
								<CircleAlert width="18" height="18" />
							</Callout.Icon>
							<Callout.Text>
								We couldn't find a Bluesky account with that handle. Please try
								again. Make sure you use the full handle (e.g.
								myusername.bsky.social). If you use a custom domain as your
								handle, use that instead (e.g. sill.social).
							</Callout.Text>
						</Callout.Root>
					)}
					{searchParams.get("error") === "denied" && (
						<Callout.Root mt="4" color="red">
							<Callout.Icon>
								<CircleAlert width="18" height="18" />
							</Callout.Icon>
							<Callout.Text>
								You denied Sill access. If this was a mistake, please try again
								and make sure you click "Accept" on the final screen.
							</Callout.Text>
						</Callout.Root>
					)}
					{searchParams.get("error") === "oauth" && (
						<Callout.Root mt="4" color="red">
							<Callout.Icon>
								<CircleAlert width="18" height="18" />
							</Callout.Icon>
							<Callout.Text>
								We had trouble connecting to your Bluesky account. Please try
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
