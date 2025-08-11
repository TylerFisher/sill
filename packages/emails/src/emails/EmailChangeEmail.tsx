import React from "react";
import EmailHeading from "../components/Heading";
import EmailLayout from "../components/Layout";
import Lede from "../components/Lede";
import OTPBlock from "../components/OTPBlock";

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