import React from "react";
import { Button, Heading, Section, Text } from "@react-email/components";

/**
 * A midstream Sill+ promo for the daily digest. The digest itself is free for
 * everyone now, so this is shown to non-subscribers (`subscribed !== "plus"`)
 * as a value nudge, dropped roughly in the middle of the link list.
 */
const DigestPromo = () => (
	<Section style={section}>
		<Heading as="h3" style={heading}>
			Want Sill on your phone?
		</Heading>
		<Text style={text}>
			Sill+ members get access to the private iOS beta. Subscribe to support
			Sill and try it first.
		</Text>
		<Button href="https://sill.social/settings/subscription" style={button}>
			Subscribe to Sill+
		</Button>
	</Section>
);

const section = {
	padding: "24px",
	backgroundColor: "#FEFCE9",
	borderRadius: "12px",
	margin: "40px 0",
	textAlign: "center" as const,
};

const heading = {
	margin: "0 0 8px 0",
	color: "#9E6C00",
};

const text = {
	margin: "0 0 16px 0",
	color: "black",
};

const button = {
	borderRadius: "0.5em",
	padding: "12px 24px",
	backgroundColor: "#9E6C00",
	color: "#FFFFFF",
	display: "inline-block",
};

export default DigestPromo;
