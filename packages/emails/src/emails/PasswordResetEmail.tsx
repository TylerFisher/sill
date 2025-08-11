import React from "react";
import EmailHeading from "../components/Heading";
import EmailLayout from "../components/Layout";
import Lede from "../components/Lede";
import OTPBlock from "../components/OTPBlock";

interface PasswordResetEmailProps {
	otp: string;
}

const PasswordResetEmail = ({ otp }: PasswordResetEmailProps) => {
	return (
		<EmailLayout preview="Confirm your password reset request">
			<EmailHeading>Password reset request</EmailHeading>
			<Lede>
				Someone, hopefully you, requested a password reset. If this was you, use
				the verification code below to confirm your request:
			</Lede>
			<OTPBlock>{otp}</OTPBlock>
		</EmailLayout>
	);
};

export default PasswordResetEmail;