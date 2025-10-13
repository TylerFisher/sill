import React from "react";
import EmailHeading from "../components/Heading.js";
import EmailLayout from "../components/Layout.js";
import Lede from "../components/Lede.js";
import OTPBlock from "../components/OTPBlock.js";

const EmailChangeEmail = ({
	otp,
}: {
	otp: string;
}) => {
	return (
		<EmailLayout preview="Confirm your email change request">
			<EmailHeading>Confirm your email change request</EmailHeading>
			<Lede>Here's your verification code:</Lede>
			<OTPBlock>{otp}</OTPBlock>
		</EmailLayout>
	);
};

export default EmailChangeEmail;