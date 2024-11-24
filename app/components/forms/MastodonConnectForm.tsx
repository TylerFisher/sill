import {
	Card,
	Heading,
	Text,
	Button,
	Badge,
	Callout,
	TextField,
	Link,
} from "@radix-ui/themes";
import { Form } from "@remix-run/react";
import { CircleAlert } from "lucide-react";
import type {
	mastodonAccount,
	mastodonInstance,
} from "~/drizzle/schema.server";
import SubmitButton from "./SubmitButton";

type Account = typeof mastodonAccount.$inferSelect;
interface AccountWithInstance extends Account {
	mastodonInstance: typeof mastodonInstance.$inferSelect;
}

interface MastodonConnectFormProps {
	account: AccountWithInstance | null;
	instances: { instance: string }[];
	searchParams: URLSearchParams;
}

const MastodonConnectForm = ({
	account,
	instances,
	searchParams,
}: MastodonConnectFormProps) => {
	return (
		<Card mb="6">
			<Heading as="h3" size="5" mb="1">
				Mastodon
			</Heading>
			{account ? (
				<>
					<Text size="2" as="p" mb="3">
						You are connected to{" "}
						<Badge>{account.mastodonInstance.instance}</Badge>.
					</Text>
					<Form action="/mastodon/auth/revoke" method="post">
						<SubmitButton color="red" label="Disconnect" />
					</Form>
					<Callout.Root mt="4">
						<Callout.Icon>
							<CircleAlert width="18" height="18" />
						</Callout.Icon>
						<Callout.Text>
							For best performance with Sill, we recommend that you turn off the
							"Group boosts in timelines" setting in your Mastodon preferences.
							Turning this off allows us to show you everyone who posted or
							reposted a particular link. You can go{" "}
							<Link
								href={`https://${account.mastodonInstance.instance}/settings/preferences/other`}
								target="_blank"
								rel="noreferrer"
							>
								to this page
							</Link>{" "}
							to change the setting.
						</Callout.Text>
					</Callout.Root>
				</>
			) : (
				<>
					<Form action="/mastodon/auth" method="get">
						<TextField.Root
							type="text"
							name="instance"
							placeholder="Enter your Mastodon instance (e.g. mastodon.social)"
							required
							mb="3"
							list="instances"
							autoComplete="off"
						>
							<TextField.Slot>https://</TextField.Slot>
						</TextField.Root>
						<SubmitButton label="Connect" size="2" />
						{searchParams.get("error") === "instance" && (
							<Callout.Root mt="4">
								<Callout.Icon>
									<CircleAlert width="18" height="18" />
								</Callout.Icon>
								<Callout.Text>
									We couldn't connect to that Mastodon instance. Please try
									again.
								</Callout.Text>
							</Callout.Root>
						)}
					</Form>
					<Callout.Root mt="4">
						<Callout.Icon>
							<CircleAlert width="18" height="18" />
						</Callout.Icon>
						<Callout.Text>
							For best performance with Sill, we recommend that you turn off the
							"Group boosts in timelines" setting in your Mastodon preferences{" "}
							<strong>before you connect</strong>. Turning this off allows us to
							show you everyone who posted or reposted a particular link. Go to{" "}
							<code>https://your-instance/settings/preferences/other</code> to
							turn off the setting.
						</Callout.Text>
					</Callout.Root>
				</>
			)}
		</Card>
	);
};

export default MastodonConnectForm;
