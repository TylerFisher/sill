import { Section, Text } from "@react-email/components";
import type { PropsWithChildren } from "react";

const OTPBlock = ({ children }: PropsWithChildren) => {
	return (
		<Section style={otpBlockStyles}>
			<Text style={otpTextStyles}>{children}</Text>
		</Section>
	);
};

const otpBlockStyles = {
	background: "rgb(245, 244, 245)",
	borderRadius: "4px",
	marginBottom: "30px",
	padding: "40px 10px",
};

const otpTextStyles = {
	fontSize: "30px",
	textAlign: "center" as const,
	verticalAlign: "middle",
};

export default OTPBlock;
