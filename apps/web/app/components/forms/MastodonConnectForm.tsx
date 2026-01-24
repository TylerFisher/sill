import { Badge, Callout, Card, Heading, Link, Text } from "@radix-ui/themes";
import { CircleAlert } from "lucide-react";
import { Form } from "react-router";
import type { SubscriptionStatus, AccountWithInstance } from "@sill/schema";
import type { ListOption } from "./ListSwitch";
import Lists from "./Lists";
import MastodonAuthForm from "./MastodonAuthForm";
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
					<MastodonAuthForm mode="connect" searchParams={searchParams} />
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
