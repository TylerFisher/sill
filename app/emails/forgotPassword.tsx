import EmailHeading from "~/components/emails/Heading";
import EmailLayout from "~/components/emails/Layout";
import Lede from "~/components/emails/Lede";
import OTPBlock from "~/components/emails/OTPBlock";

const PasswordResetEmail = ({
	otp,
}: {
	otp: string;
}) => {
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
