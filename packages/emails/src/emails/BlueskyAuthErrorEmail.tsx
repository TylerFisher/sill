import { Button } from "@react-email/components";
import React from "react";
import EmailHeading from "../components/Heading.js";
import EmailLayout from "../components/Layout.js";
import Lede from "../components/Lede.js";

interface BlueskyAuthErrorEmailProps {
	handle: string;
	settingsUrl: string;
}

const BlueskyAuthErrorEmail = ({
	handle,
	settingsUrl,
}: BlueskyAuthErrorEmailProps) => {
	return (
		<EmailLayout preview="Reconnect your Bluesky account">
			<EmailHeading>Reconnect your Bluesky account</EmailHeading>
			<Lede>
				We're unable to access your Bluesky account (@{handle}) to fetch your
				timeline. This can happen for a number of reasons, including migrating
				your PDS, or intermittent errors in our OAuth process. We apologize for
				the inconvenience.
			</Lede>
			<Lede>
				To continue receiving links from Bluesky, please reconnect your account
				by logging into Sill.
			</Lede>
			<Button
				href={settingsUrl}
				style={{
					background: "#000",
					color: "#fff",
					padding: "12px 20px",
					borderRadius: "5px",
				}}
			>
				Reconnect Bluesky Account
			</Button>
		</EmailLayout>
	);
};

export default BlueskyAuthErrorEmail;
