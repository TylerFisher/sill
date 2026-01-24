import { Box, Button, Callout, Text } from "@radix-ui/themes";
import { CircleAlert } from "lucide-react";
import { Form } from "react-router";
import BlueskyHandleAutocomplete from "./BlueskyHandleAutocomplete";

type AuthMode = "login" | "signup" | "connect";

interface BlueskyAuthFormProps {
	mode: AuthMode;
	searchParams: URLSearchParams;
}

const modeLabels: Record<AuthMode, { button: string }> = {
	login: {
		button: "Continue",
	},
	signup: {
		button: "Continue",
	},
	connect: {
		button: "Connect",
	},
};

const BlueskyAuthForm = ({ mode, searchParams }: BlueskyAuthFormProps) => {
	const { button } = modeLabels[mode];
	const isConnect = mode === "connect";

	return (
		<Form action="/bluesky/auth" method="GET">
			{mode !== "connect" && <input type="hidden" name="mode" value={mode} />}
			<Box mb={isConnect ? "0" : "4"}>
				<Text
					as="label"
					size="3"
					weight="bold"
					mb="1"
					style={{ display: "block" }}
				>
					Atmosphere handle
				</Text>
				<Text size="2" color="gray" mb="2" style={{ display: "block" }}>
					Your Bluesky, Blacksky, Northsky, or other compatible handle
				</Text>
				<BlueskyHandleAutocomplete name="handle" required />
				<Button
					type="submit"
					size="3"
					mt="3"
					style={isConnect ? undefined : { width: "100%" }}
				>
					{button}
				</Button>
			</Box>

			{searchParams.get("error") === "oauth" && (
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
						with Bluesky. Please try again.
					</Callout.Text>
				</Callout.Root>
			)}
			{searchParams.get("error") === "resolver" && (
				<Callout.Root mt="4" mb="4" color="red">
					<Callout.Icon>
						<CircleAlert width="18" height="18" />
					</Callout.Icon>
					<Callout.Text>
						We couldn't find that Bluesky handle. Please check and try again.
						Make sure you use the full handle (e.g. myusername.bsky.social).
					</Callout.Text>
				</Callout.Root>
			)}
			{searchParams.get("error") === "denied" && (
				<Callout.Root mt="4" mb="4" color="red">
					<Callout.Icon>
						<CircleAlert width="18" height="18" />
					</Callout.Icon>
					<Callout.Text>
						You denied Sill access. If this was a mistake, please try again and
						make sure you click "Accept" on the final screen.
					</Callout.Text>
				</Callout.Root>
			)}
			{searchParams.get("error") === "handle_required" && (
				<Callout.Root mt="4" mb="4" color="red">
					<Callout.Icon>
						<CircleAlert width="18" height="18" />
					</Callout.Icon>
					<Callout.Text>
						Please enter your Bluesky handle to continue.
					</Callout.Text>
				</Callout.Root>
			)}
		</Form>
	);
};

export default BlueskyAuthForm;
