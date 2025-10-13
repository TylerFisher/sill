import {
	Badge,
	Callout,
	Card,
	Heading,
	Link,
	Text,
	TextField,
} from "@radix-ui/themes";
import { CircleAlert } from "lucide-react";
import { Form } from "react-router";
import type { SubscriptionStatus, AccountWithInstance } from "@sill/schema";
import type { ListOption } from "./ListSwitch";
import Lists from "./Lists";
import SubmitButton from "./SubmitButton";

interface MastodonConnectFormProps {
	account: AccountWithInstance | null;
	searchParams: URLSearchParams;
	listOptions: ListOption[];
	subscribed: SubscriptionStatus;
	loading?: boolean;
}

const MastodonConnectForm = ({
	account,
	searchParams,
	listOptions,
	subscribed,
	loading = false,
}: MastodonConnectFormProps) => {
	return (
		<Card>
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
							To show you everyone who posted or reposted a particular link, we
							recommend that you turn off the "Group boosts in timelines"
							setting in your Mastodon preferences. You can go{" "}
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
					<Lists
						listOptions={listOptions}
						account={account}
						subscribed={subscribed}
						loading={loading}
					/>
				</>
			) : (
				<>
					<Form action="/mastodon/auth" method="GET">
						<Text htmlFor="instance" size="2" as="label">
							Enter your Mastodon handle (e.g. @username@mastodon.social)
						</Text>
						<TextField.Root
							type="text"
							name="instance"
							placeholder="@username@mastodon.social"
							required
							mb="3"
							list="instances"
							autoComplete="off"
						>
							<TextField.Slot />
						</TextField.Root>
						<SubmitButton label="Connect" size="2" />
						{searchParams.get("error") === "instance" && (
							<Callout.Root mt="4" color="red">
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
							To show you everyone who posted or reposted a particular link, we
							recommend that you turn off the "
							<Link href="https://docs.joinmastodon.org/user/preferences/#misc">
								Group boosts in timelines
							</Link>
							" setting in your Mastodon preferences{" "}
							<strong>before you connect</strong>.
						</Callout.Text>
					</Callout.Root>
				</>
			)}
		</Card>
	);
};

export default MastodonConnectForm;
