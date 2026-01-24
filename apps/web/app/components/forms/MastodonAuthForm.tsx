import { Box, Button, Callout, Text, TextField } from "@radix-ui/themes";
import { CircleAlert } from "lucide-react";
import { Form } from "react-router";

type AuthMode = "login" | "signup" | "connect";

interface MastodonAuthFormProps {
	mode: AuthMode;
	searchParams: URLSearchParams;
}

const modeLabels: Record<AuthMode, { button: string }> = {
	login: { button: "Continue" },
	signup: { button: "Continue" },
	connect: { button: "Connect" },
};

const MastodonAuthForm = ({ mode, searchParams }: MastodonAuthFormProps) => {
	const { button } = modeLabels[mode];
	const isConnect = mode === "connect";

	return (
		<Form action="/mastodon/auth" method="GET">
			{mode !== "connect" && <input type="hidden" name="mode" value={mode} />}
			<Box mb={isConnect ? "0" : "4"}>
				<Text
					as="label"
					size="3"
					weight="bold"
					mb="1"
					style={{ display: "block" }}
				>
					Mastodon instance
				</Text>
				<TextField.Root
					type="text"
					name="instance"
					placeholder="mastodon.social"
					required
					size="3"
					autoComplete="off"
				>
					<TextField.Slot />
				</TextField.Root>
				<Button
					type="submit"
					size="3"
					mt="3"
					style={isConnect ? undefined : { width: "100%" }}
				>
					{button}
				</Button>
			</Box>

			{searchParams.get("error") === "mastodon_oauth" && (
				<Callout.Root mt="4" mb="4" color="red">
					<Callout.Icon>
						<CircleAlert width="18" height="18" />
					</Callout.Icon>
					<Callout.Text>
						We had trouble{" "}
						{mode === "login"
							? "logging you in"
							: mode === "signup"
								? "signing you up"
								: "connecting"}{" "}
						with Mastodon. Please try again.
					</Callout.Text>
				</Callout.Root>
			)}
			{searchParams.get("error") === "instance" && (
				<Callout.Root mt="4" mb="4" color="red">
					<Callout.Icon>
						<CircleAlert width="18" height="18" />
					</Callout.Icon>
					<Callout.Text>
						We couldn't connect to that Mastodon instance. Please check and try
						again.
					</Callout.Text>
				</Callout.Root>
			)}
			{searchParams.get("error") === "token_error" && (
				<Callout.Root mt="4" mb="4" color="red">
					<Callout.Icon>
						<CircleAlert width="18" height="18" />
					</Callout.Icon>
					<Callout.Text>
						Failed to authenticate with Mastodon. Please try again.
					</Callout.Text>
				</Callout.Root>
			)}
			{searchParams.get("error") === "account_error" && (
				<Callout.Root mt="4" mb="4" color="red">
					<Callout.Icon>
						<CircleAlert width="18" height="18" />
					</Callout.Icon>
					<Callout.Text>
						Failed to get account information from Mastodon. Please try again.
					</Callout.Text>
				</Callout.Root>
			)}
		</Form>
	);
};

export default MastodonAuthForm;
