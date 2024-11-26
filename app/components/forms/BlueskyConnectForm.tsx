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
import SubmitButton from "./SubmitButton";

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
			{/* <Text size="2" as="p" mb="3">
				Bluesky is experiencing some issues right now. We will reenable
				connection when Bluesky is stable.
			</Text> */}
			{account ? (
				<>
					<Text size="2" as="p" mb="3">
						You are connected to <Badge>{account.handle}</Badge>.
					</Text>
					<Form action="/bluesky/auth/revoke" method="post">
						<SubmitButton label="Disconnect" color="red" size="2" />
					</Form>
				</>
			) : (
				<Form action="/bluesky/auth" method="GET">
					<Text htmlFor="handle" size="2" as="label">
						Enter your Bluesky handle (e.g. username.bsky.social)
					</Text>
					<TextField.Root
						name="handle"
						placeholder="username.bsky.social"
						required
						mb="3"
					>
						<TextField.Slot />
					</TextField.Root>
					<SubmitButton size="2" label="Connect" />
					{searchParams.get("error") === "resolver" && (
						<Callout.Root mt="4">
							<Callout.Icon>
								<CircleAlert width="18" height="18" />
							</Callout.Icon>
							<Callout.Text>
								We couldn't find a Bluesky account with that handle. Please try
								again. Make sure you use the full handle (e.g.
								myusername.bsky.social). If you use a custom domain as your
								handle, use that instead (e.g. tylerjfisher.com).
							</Callout.Text>
						</Callout.Root>
					)}
					{searchParams.get("error") === "denied" && (
						<Callout.Root mt="4">
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
						<Callout.Root mt="4">
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
