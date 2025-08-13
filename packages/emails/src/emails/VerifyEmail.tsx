import React from "react";
import { Text } from "@react-email/components";
import EmailHeading from "../components/Heading.js";
import EmailLayout from "../components/Layout.js";
import Lede from "../components/Lede.js";
import OTPBlock from "../components/OTPBlock.js";

interface VerifyEmailProps {
	otp: string;
}

const VerifyEmail = ({ otp }: VerifyEmailProps) => {
	return (
		<EmailLayout preview="Verify your email">
			<EmailHeading>Verify your email for your new Sill account</EmailHeading>
			<Lede>Here's your verification code:</Lede>
			<OTPBlock>{otp}</OTPBlock>
			<Text>
				This token will expire in five minutes. If you need a new token, fill
				out the form you used to generate this token again.
			</Text>
		</EmailLayout>
	);
};

export default VerifyEmail;
