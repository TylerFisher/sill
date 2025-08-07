import EmailHeading from "~/components/emails/Heading";
import EmailLayout from "~/components/emails/Layout";
import Lede from "~/components/emails/Lede";
import OTPBlock from "~/components/emails/OTPBlock";

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
