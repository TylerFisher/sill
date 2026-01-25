import { Badge, Box, Callout, Flex } from "@radix-ui/themes";
import type { AccountWithInstance } from "@sill/schema";
import { CheckCircle } from "lucide-react";
import BlueskyAuthForm from "~/components/forms/BlueskyAuthForm";
import MastodonAuthForm from "~/components/forms/MastodonAuthForm";
import type { BlueskyAccount } from "./types";

interface AccountsStepProps {
	blueskyAccount: BlueskyAccount | null;
	mastodonAccount: AccountWithInstance | null;
	searchParams: URLSearchParams;
}

export default function AccountsStep({
	blueskyAccount,
	mastodonAccount,
	searchParams,
}: AccountsStepProps) {
	const hasBluesky = !!blueskyAccount;
	const hasMastodon = !!mastodonAccount;
	const hasBoth = hasBluesky && hasMastodon;

	if (hasBoth) {
		return (
			<Callout.Root>
				<Callout.Icon>
					<CheckCircle size={16} />
				</Callout.Icon>
				<Callout.Text>
					Both accounts connected: <Badge>{blueskyAccount.handle}</Badge> and{" "}
					<Badge>{mastodonAccount.mastodonInstance.instance}</Badge>
				</Callout.Text>
			</Callout.Root>
		);
	}

	return (
		<Flex direction="column" gap="6">
			{!hasBluesky && (
				<Box>
					<BlueskyAuthForm mode="connect" searchParams={searchParams} />
				</Box>
			)}
			{!hasMastodon && (
				<Box>
					<MastodonAuthForm mode="connect" searchParams={searchParams} />
				</Box>
			)}
			{(hasBluesky || hasMastodon) && (
				<Callout.Root>
					<Callout.Icon>
						<CheckCircle size={16} />
					</Callout.Icon>
					<Callout.Text>
						Connected: {hasBluesky && <Badge>{blueskyAccount.handle}</Badge>}
						{hasMastodon && (
							<Badge>{mastodonAccount.mastodonInstance.instance}</Badge>
						)}
					</Callout.Text>
				</Callout.Root>
			)}
		</Flex>
	);
}
